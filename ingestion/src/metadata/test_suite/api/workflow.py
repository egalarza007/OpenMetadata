#  Copyright 2021 Collate
#  Licensed under the Apache License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#  http://www.apache.org/licenses/LICENSE-2.0
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.

"""
Workflow definition for the test suite
"""

from __future__ import annotations

import traceback
from logging import Logger
from typing import List, Optional, Set, Tuple

import click
from pydantic import ValidationError

from metadata.config.common import WorkflowExecutionError
from metadata.config.workflow import get_sink
from metadata.generated.schema.api.tests.createTestCase import CreateTestCaseRequest
from metadata.generated.schema.api.tests.createTestSuite import CreateTestSuiteRequest
from metadata.generated.schema.entity.data.table import IntervalType, Table
from metadata.generated.schema.entity.services.connections.metadata.openMetadataConnection import (
    OpenMetadataConnection,
)
from metadata.generated.schema.entity.services.databaseService import DatabaseService
from metadata.generated.schema.metadataIngestion.testSuitePipeline import (
    TestSuitePipeline,
)
from metadata.generated.schema.metadataIngestion.workflow import (
    OpenMetadataWorkflowConfig,
)
from metadata.generated.schema.tests.testCase import TestCase
from metadata.generated.schema.tests.testDefinition import TestDefinition
from metadata.generated.schema.tests.testSuite import TestSuite
from metadata.ingestion.api.parser import parse_workflow_config_gracefully
from metadata.ingestion.api.processor import ProcessorStatus
from metadata.ingestion.ometa.ometa_api import OpenMetadata
from metadata.interfaces.sqa_interface import SQAInterface
from metadata.orm_profiler.api.models import TablePartitionConfig
from metadata.test_suite.api.models import TestCaseDefinition, TestSuiteProcessorConfig
from metadata.test_suite.runner.core import DataTestsRunner
from metadata.utils import entity_link
from metadata.utils.logger import test_suite_logger

logger: Logger = test_suite_logger()


class TestSuiteWorkflow:
    """workflow to run the test suite"""

    def __init__(self, config: OpenMetadataWorkflowConfig):
        """
        Instantiate test suite workflow class

        Args:
            config: OM workflow configuration object

        Attributes:
            config: OM workflow configuration object
            source_config: TestSuitePipeline object
        """
        self.config = config

        self.source_config: TestSuitePipeline = self.config.source.sourceConfig.config
        self.processor_config: TestSuiteProcessorConfig = (
            TestSuiteProcessorConfig.parse_obj(
                self.config.processor.dict().get("config")
            )
        )

        self.metadata_config: OpenMetadataConnection = (
            self.config.workflowConfig.openMetadataServerConfig
        )
        self.metadata = OpenMetadata(self.metadata_config)

        self.status = ProcessorStatus()

        if self.config.sink:
            self.sink = get_sink(
                sink_type=self.config.sink.type,
                sink_config=self.config.sink,
                metadata_config=self.metadata_config,
                _from="test_suite",
            )

    @classmethod
    def create(cls, config_dict) -> TestSuiteWorkflow:
        """
        Instantiate a TestSuiteWorkflow object form a yaml or json config file

        Args:
            config_dict: json or yaml configuration file
        Returns:
            a test suite workflow
        """
        try:
            config = parse_workflow_config_gracefully(config_dict)
            return cls(config)
        except ValidationError as err:
            logger.error(
                f"Error trying to parse the Profiler Workflow configuration: {err}"
            )
            raise err

    def _filter_test_cases_for_table_entity(
        self, table_fqn: str, test_cases: List[TestCase]
    ) -> list[TestCase]:
        """Filter test cases for specific entity"""
        return [
            test_case
            for test_case in test_cases
            if test_case.entityLink.__root__.split("::")[2].replace(">", "")
            == table_fqn
        ]

    def _get_unique_table_entities(self, test_cases: List[TestCase]) -> Set:
        """from a list of test cases extract unique table entities"""
        table_fqns = [
            test_case.entityLink.__root__.split("::")[2].replace(">", "")
            for test_case in test_cases
        ]

        return set(table_fqns)

    def _get_service_connection_from_test_case(self, table_fqn: str):
        """given an entityLink return the service connection

        Args:
            entity_link: entity link for the test case
        """
        if self.config.source.type not in {"sample-data", "sample-usage"}:
            service = self.metadata.get_by_name(
                entity=DatabaseService,
                fqn=table_fqn.split(".")[0],
            )

            if service:
                service_connection = (
                    self.metadata.secrets_manager_client.retrieve_service_connection(
                        service,
                        "databaseservice",
                    )
                )
                return service_connection.__root__.config

            logger.error(
                f"Could not retrive connection details for entity {entity_link}"
            )
            raise ValueError()

    def _get_table_entity_from_test_case(self, table_fqn: str):
        """given an entityLink return the table entity

        Args:
            entity_link: entity link for the test case
        """
        return self.metadata.get_by_name(
            entity=Table,
            fqn=table_fqn,
            fields=["profile"],
        )

    def _get_profile_sample(self, entity: Table) -> Optional[float]:
        """Get profile sample

        Args:
            entity: table entity
        """
        if entity.tableProfilerConfig:
            return entity.tableProfilerConfig.profileSample
        return None

    def _get_profile_query(self, entity: Table) -> Optional[str]:
        """Get profile query

        Args:
            entity: table entity
        """
        if entity.tableProfilerConfig:
            return entity.tableProfilerConfig.profileQuery

        return None

    def _get_partition_details(self, entity: Table) -> Optional[TablePartitionConfig]:
        """Get partition details

        Args:
            entity: table entity
        """
        if entity.tablePartition:
            if entity.tablePartition.intervalType in {
                IntervalType.TIME_UNIT,
                IntervalType.INGESTION_TIME,
            }:
                try:
                    partition_field = entity.tablePartition.columns[0]
                except Exception:
                    raise TypeError(
                        "Unsupported ingestion based partition type. Skipping table"
                    )

                return TablePartitionConfig(
                    partitionField=partition_field,
                )

            raise TypeError(
                f"Unsupported partition type {entity.tablePartition.intervalType}. Skipping table"
            )

        return None

    def _create_sqa_tests_runner_interface(self, table_fqn: str):
        """create the interface to execute test against SQA sources"""
        table_entity = self._get_table_entity_from_test_case(table_fqn)
        return SQAInterface(
            service_connection_config=self._get_service_connection_from_test_case(
                table_fqn
            ),
            metadata_config=self.metadata_config,
            table_entity=table_entity,
            profile_sample=self._get_profile_sample(table_entity)
            if not self._get_profile_query(table_entity)
            else None,
            profile_query=self._get_profile_query(table_entity)
            if not self._get_profile_sample(table_entity)
            else None,
            partition_config=self._get_partition_details(table_entity)
            if not self._get_profile_query(table_entity)
            else None,
        )

    def _create_data_tests_runner(self, sqa_interface):
        """create main object to run data test validation"""
        return DataTestsRunner(sqa_interface)

    def get_test_suite_entity_for_ui_workflow(self) -> Optional[List[TestSuite]]:
        """
        try to get test suite name from source.servicName.
        In the UI workflow we'll write the entity name (i.e. the test suite)
        to source.serviceName.
        """
        test_suite = self.metadata.get_by_name(
            entity=TestSuite,
            fqn=self.config.source.serviceName,
        )

        if test_suite:
            return [test_suite]
        return None

    def get_or_create_test_suite_entity_for_cli_workflow(
        self,
    ) -> List[TestSuite]:
        """
        Fro the CLI workflow we'll have n testSuite in the
        processor.config.testSuites
        """
        test_suite_entities = []

        for test_suite in self.processor_config.testSuites:
            test_suite_entity = self.metadata.get_by_name(
                entity=TestSuite,
                fqn=test_suite.name,
            )
            if not test_suite_entity:
                test_suite_entity = self.metadata.create_or_update(
                    CreateTestSuiteRequest(
                        name=test_suite.name,
                        description=test_suite.description,
                    )
                )
            test_suite_entities.append(test_suite_entity)

        return test_suite_entities

    def get_test_cases_from_test_suite(
        self, test_suites: List[TestSuite]
    ) -> List[TestCase]:
        """
        Get test cases from test suite name

        Args:
            test_suite_name: the name of the test suite
        """

        test_cases_entity = []
        for test_suite in test_suites:
            test_case_entity_list = self.metadata.list_entities(
                entity=TestCase,
                fields=["testSuite", "entityLink", "testDefinition"],
                params={"testSuiteId": test_suite.id.__root__},
            )
            test_cases_entity.extend(test_case_entity_list.entities)

        return test_cases_entity

    def get_test_case_from_cli_config(self) -> List[str]:
        """Get all the test cases names defined in the CLI config file"""
        return [
            (test_case, test_suite)
            for test_suite in self.processor_config.testSuites
            for test_case in test_suite.testCases
        ]

    def compare_and_create_test_cases(
        self,
        cli_config_test_cases_def: List[Tuple[TestCaseDefinition, TestSuite]],
        test_cases: List[TestCase],
    ) -> Optional[List[TestCase]]:
        """
        compare test cases defined in CLI config workflow with test cases
        defined on the server

        Args:
            cli_config_test_case_name: test cases defined in CLI workflow associated with its test suite
            test_cases: list of test cases entities fetch from the server using test suite names in the config file
        """
        test_case_names_to_create = set(
            [test_case_def[0].name for test_case_def in cli_config_test_cases_def]
        ) - set([test_case.name.__root__ for test_case in test_cases])

        if not test_case_names_to_create:
            return None

        created_test_case = []
        for test_case_name_to_create in test_case_names_to_create:
            logger.info(f"Creating test case with name {test_case_name_to_create}")
            test_case_to_create, test_suite = next(
                (
                    cli_config_test_case_def
                    for cli_config_test_case_def in cli_config_test_cases_def
                    if cli_config_test_case_def[0].name == test_case_name_to_create
                ),
                (None, None),
            )
            try:
                created_test_case.append(
                    self.metadata.create_or_update(
                        CreateTestCaseRequest(
                            name=test_case_to_create.name,
                            entityLink=test_case_to_create.entityLink,
                            testDefinition=self.metadata.get_entity_reference(
                                entity=TestDefinition,
                                fqn=test_case_to_create.testDefinitionName,
                            ),
                            testSuite=self.metadata.get_entity_reference(
                                entity=TestSuite, fqn=test_suite.name
                            ),
                            parameterValues=[
                                parameter_values
                                for parameter_values in test_case_to_create.parameterValues
                            ],
                        )
                    )
                )
            except Exception as exc:
                logger.warning(
                    f"Couldn't create test case name {test_case_name_to_create}: {exc}"
                )
                logger.debug(traceback.format_exc(exc))

        return created_test_case

    def execute(self):
        """Execute test suite workflow"""
        test_suites = (
            self.get_test_suite_entity_for_ui_workflow()
            or self.get_or_create_test_suite_entity_for_cli_workflow()
        )
        test_cases = self.get_test_cases_from_test_suite(test_suites)
        if self.processor_config.testSuites:
            cli_config_test_cases_def = self.get_test_case_from_cli_config()
            runtime_created_test_cases = self.compare_and_create_test_cases(
                cli_config_test_cases_def, test_cases
            )
            if runtime_created_test_cases:
                test_cases.extend(runtime_created_test_cases)

        unique_table_fqns = self._get_unique_table_entities(test_cases)

        for table_fqn in unique_table_fqns:
            try:
                sqa_interface = self._create_sqa_tests_runner_interface(table_fqn)
                for test_case in self._filter_test_cases_for_table_entity(
                    table_fqn, test_cases
                ):
                    try:
                        data_test_runner = self._create_data_tests_runner(sqa_interface)
                        test_result = data_test_runner.run_and_handle(test_case)
                        if not test_result:
                            continue
                        if hasattr(self, "sink"):
                            self.sink.write_record(test_result)
                        logger.info(
                            f"Successfuly ran test case {test_case.name.__root__}"
                        )
                        self.status.processed(test_case.fullyQualifiedName.__root__)
                    except Exception as exc:
                        logger.debug(traceback.format_exc(exc))
                        logger.warning(
                            f"Could not run test case {test_case.name}: {exc}"
                        )
            except TypeError as exc:
                logger.debug(traceback.format_exc(exc))
                logger.warning(f"Could not run test case {test_case.name}: {exc}")
                self.status.failure(test_case.fullyQualifiedName.__root__)

    def print_status(self) -> int:
        """
        Runs click echo to print the
        workflow results
        """
        click.echo()
        click.secho("Processor Status:", bold=True)
        click.echo(self.status.as_string())
        if hasattr(self, "sink"):
            click.secho("Sink Status:", bold=True)
            click.echo(self.sink.get_status().as_string())
            click.echo()

        if self.status.failures or (
            hasattr(self, "sink") and self.sink.get_status().failures
        ):
            click.secho("Workflow finished with failures", fg="bright_red", bold=True)
            return 1

        click.secho("Workflow finished successfully", fg="green", bold=True)
        return 0

    def raise_from_status(self, raise_warnings=False):
        """
        Check source, processor and sink status and raise if needed

        Our profiler source will never log any failure, only filters,
        as we are just picking up data from OM.
        """

        if self.status.failures:
            raise WorkflowExecutionError("Processor reported errors", self.status)
        if hasattr(self, "sink") and self.sink.get_status().failures:
            raise WorkflowExecutionError("Sink reported errors", self.sink.get_status())

        if raise_warnings:
            if self.status.warnings:
                raise WorkflowExecutionError("Processor reported warnings", self.status)
            if hasattr(self, "sink") and self.sink.get_status().warnings:
                raise WorkflowExecutionError(
                    "Sink reported warnings", self.sink.get_status()
                )

    def stop(self):
        """
        Close all connections
        """
        self.metadata.close()

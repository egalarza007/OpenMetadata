/*
 *  Copyright 2021 Collate
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import { AxiosError } from 'axios';
import cryptoRandomString from 'crypto-random-string-with-promisify-polyfill';
import {
  Bucket,
  DynamicFormFieldType,
  DynamicObj,
  ServicesData,
  ServiceTypes,
} from 'Models';
import React from 'react';
import { getEntityCount } from '../axiosAPIs/miscAPI';
import { ResourceEntity } from '../components/PermissionProvider/PermissionProvider.interface';
import { GlobalSettingOptions } from '../constants/globalSettings.constants';
import {
  addLineageIngestionGuide,
  addMetadataIngestionGuide,
  addProfilerIngestionGuide,
  addServiceGuide,
  addServiceGuideWOAirflow,
  addUsageIngestionGuide,
} from '../constants/service-guide.constant';
import {
  AIRBYTE,
  AIRFLOW,
  ATHENA,
  AZURESQL,
  BIGQUERY,
  CLICKHOUSE,
  DAGSTER,
  DASHBOARD_DEFAULT,
  DATABASE_DEFAULT,
  DATABRICK,
  DATALAKE,
  DEFAULT_SERVICE,
  DELTALAKE,
  DRUID,
  DYNAMODB,
  FIVETRAN,
  GLUE,
  HIVE,
  IBMDB2,
  KAFKA,
  LOOKER,
  MARIADB,
  METABASE,
  MLFLOW,
  MODE,
  MSSQL,
  MYSQL,
  ORACLE,
  PINOT,
  PIPELINE_DEFAULT,
  POSTGRES,
  POWERBI,
  PRESTO,
  PULSAR,
  REDASH,
  REDSHIFT,
  SALESFORCE,
  SCIKIT,
  serviceTypes,
  SINGLESTORE,
  SNOWFLAKE,
  SQLITE,
  SUPERSET,
  TABLEAU,
  TOPIC_DEFAULT,
  TRINO,
  VERTICA,
} from '../constants/services.const';
import { ServiceCategory } from '../enums/service.enum';
import { ConnectionType } from '../generated/api/services/ingestionPipelines/testServiceConnection';
import { Database } from '../generated/entity/data/database';
import { MlModelServiceType } from '../generated/entity/data/mlmodel';
import {
  DashboardService,
  DashboardServiceType,
} from '../generated/entity/services/dashboardService';
import { DatabaseServiceType } from '../generated/entity/services/databaseService';
import { PipelineType as IngestionPipelineType } from '../generated/entity/services/ingestionPipelines/ingestionPipeline';
import {
  MessagingService,
  MessagingServiceType,
} from '../generated/entity/services/messagingService';
import { MlmodelService } from '../generated/entity/services/mlmodelService';
import {
  PipelineService,
  PipelineServiceType,
} from '../generated/entity/services/pipelineService';
import { ServicesType } from '../interface/service.interface';
import { getEntityDeleteMessage, pluralize } from './CommonUtils';
import { getDashboardURL } from './DashboardServiceUtils';
import { getBrokers } from './MessagingServiceUtils';
import { showErrorToast } from './ToastUtils';

export const serviceTypeLogo = (type: string) => {
  switch (type) {
    case DatabaseServiceType.Mysql:
      return MYSQL;

    case DatabaseServiceType.Redshift:
      return REDSHIFT;

    case DatabaseServiceType.BigQuery:
      return BIGQUERY;

    case DatabaseServiceType.Hive:
      return HIVE;

    case DatabaseServiceType.Postgres:
      return POSTGRES;

    case DatabaseServiceType.Oracle:
      return ORACLE;

    case DatabaseServiceType.Snowflake:
      return SNOWFLAKE;

    case DatabaseServiceType.Mssql:
      return MSSQL;

    case DatabaseServiceType.Athena:
      return ATHENA;

    case DatabaseServiceType.Presto:
      return PRESTO;

    case DatabaseServiceType.Trino:
      return TRINO;

    case DatabaseServiceType.Glue:
      return GLUE;

    case DatabaseServiceType.MariaDB:
      return MARIADB;

    case DatabaseServiceType.Vertica:
      return VERTICA;

    case DatabaseServiceType.AzureSQL:
      return AZURESQL;

    case DatabaseServiceType.Clickhouse:
      return CLICKHOUSE;

    case DatabaseServiceType.Databricks:
      return DATABRICK;

    case DatabaseServiceType.Db2:
      return IBMDB2;

    case DatabaseServiceType.Druid:
      return DRUID;

    case DatabaseServiceType.DynamoDB:
      return DYNAMODB;

    case DatabaseServiceType.SingleStore:
      return SINGLESTORE;

    case DatabaseServiceType.SQLite:
      return SQLITE;

    case DatabaseServiceType.Salesforce:
      return SALESFORCE;

    case DatabaseServiceType.DeltaLake:
      return DELTALAKE;

    case DatabaseServiceType.PinotDB:
      return PINOT;

    case DatabaseServiceType.Datalake:
      return DATALAKE;

    case MessagingServiceType.Kafka:
      return KAFKA;

    case MessagingServiceType.Pulsar:
      return PULSAR;

    case DashboardServiceType.Superset:
      return SUPERSET;

    case DashboardServiceType.Looker:
      return LOOKER;

    case DashboardServiceType.Tableau:
      return TABLEAU;

    case DashboardServiceType.Redash:
      return REDASH;

    case DashboardServiceType.Metabase:
      return METABASE;

    case DashboardServiceType.PowerBI:
      return POWERBI;

    case DashboardServiceType.Mode:
      return MODE;

    case PipelineServiceType.Airflow:
      return AIRFLOW;

    case PipelineServiceType.Airbyte:
      return AIRBYTE;

    case PipelineServiceType.Dagster:
      return DAGSTER;

    case PipelineServiceType.Fivetran:
      return FIVETRAN;

    case MlModelServiceType.Mlflow:
      return MLFLOW;

    case MlModelServiceType.Sklearn:
      return SCIKIT;
    default: {
      let logo;
      if (serviceTypes.messagingServices.includes(type)) {
        logo = TOPIC_DEFAULT;
      } else if (serviceTypes.dashboardServices.includes(type)) {
        logo = DASHBOARD_DEFAULT;
      } else if (serviceTypes.pipelineServices.includes(type)) {
        logo = PIPELINE_DEFAULT;
      } else if (serviceTypes.databaseServices.includes(type)) {
        logo = DATABASE_DEFAULT;
      } else {
        logo = DEFAULT_SERVICE;
      }

      return logo;
    }
  }
};

export const fromISOString = (isoValue = '') => {
  if (isoValue) {
    // 'P1DT 0H 0M'
    const [d, hm] = isoValue.split('T');
    const day = +d.replace('D', '').replace('P', '');
    const [h, time] = hm.split('H');
    const minute = +time.replace('M', '');

    return { day, hour: +h, minute };
  } else {
    return {
      day: 1,
      hour: 0,
      minute: 0,
    };
  }
};

export const getFrequencyTime = (isoDate: string): string => {
  const { day, hour, minute } = fromISOString(isoDate);

  return `${day}D-${hour}H-${minute}M`;
};

export const getServiceCategoryFromType = (type: string): ServiceTypes => {
  let serviceCategory: ServiceTypes = 'databaseServices';
  for (const category in serviceTypes) {
    if (serviceTypes[category as ServiceTypes].includes(type)) {
      serviceCategory = category as ServiceTypes;

      break;
    }
  }

  return serviceCategory;
};

// Note: This method is deprecated by "getEntityCountByType" of EntityUtils.ts
export const getEntityCountByService = (buckets: Array<Bucket>) => {
  const entityCounts = {
    tableCount: 0,
    topicCount: 0,
    dashboardCount: 0,
    pipelineCount: 0,
  };
  buckets?.forEach((bucket) => {
    if (serviceTypes.databaseServices.includes(bucket.key)) {
      entityCounts.tableCount += bucket.doc_count;
    } else if (serviceTypes.messagingServices.includes(bucket.key)) {
      entityCounts.topicCount += bucket.doc_count;
    } else if (serviceTypes.dashboardServices.includes(bucket.key)) {
      entityCounts.dashboardCount += bucket.doc_count;
    } else if (serviceTypes.pipelineServices.includes(bucket.key)) {
      entityCounts.pipelineCount += bucket.doc_count;
    }
  });

  return entityCounts;
};

export const getTotalEntityCountByService = (buckets: Array<Bucket> = []) => {
  let entityCounts = 0;
  buckets.forEach((bucket) => {
    entityCounts += bucket.doc_count;
  });

  return entityCounts;
};

export const getKeyValuePair = (obj: DynamicObj) => {
  return Object.entries(obj).map((v) => {
    return {
      key: v[0],
      value: v[1],
    };
  });
};

export const getKeyValueObject = (arr: DynamicFormFieldType[]) => {
  const keyValuePair: DynamicObj = {};

  arr.forEach((obj) => {
    if (obj.key && obj.value) {
      keyValuePair[obj.key] = obj.value;
    }
  });

  return keyValuePair;
};

export const getHostPortDetails = (hostport: string) => {
  let host = '',
    port = '';
  const newHostPort = hostport.split(':');

  port = newHostPort.splice(newHostPort.length - 1, 1).join();
  host = newHostPort.join(':');

  return {
    host,
    port,
  };
};

export const isRequiredDetailsAvailableForIngestion = (
  serviceCategory: ServiceCategory,
  data: ServicesData
) => {
  switch (serviceCategory) {
    case ServiceCategory.DATABASE_SERVICES: {
      const hostPort = getHostPortDetails(
        data?.databaseConnection?.hostPort || ''
      );

      return Boolean(hostPort.host && hostPort.port);
    }

    case ServiceCategory.MESSAGING_SERVICES:
    case ServiceCategory.PIPELINE_SERVICES:
    case ServiceCategory.DASHBOARD_SERVICES:
      return false;

    default:
      return true;
  }
};

export const servicePageTabs = (entity: string) => [
  {
    name: entity,
    path: entity.toLowerCase(),
  },
  {
    name: 'Ingestions',
    path: 'ingestions',
  },
  {
    name: 'Connection',
    path: 'connection',
  },
];

export const getCurrentServiceTab = (tab: string) => {
  let currentTab;
  switch (tab) {
    case 'ingestions':
      currentTab = 2;

      break;

    case 'connection':
      currentTab = 3;

      break;

    case 'entity':
    default:
      currentTab = 1;

      break;
  }

  return currentTab;
};

export const getFormattedGuideText = (
  text: string,
  toReplace: string,
  replacement: string,
  isGlobal = false
) => {
  const regExp = isGlobal ? new RegExp(toReplace, 'g') : new RegExp(toReplace);

  return text.replace(regExp, replacement);
};

export const getServiceIngestionStepGuide = (
  step: number,
  isIngestion: boolean,
  ingestionName: string,
  serviceName: string,
  ingestionType: IngestionPipelineType,
  showDeployTitle: boolean,
  isUpdated: boolean,
  isAirflowSetup = true
) => {
  let guide;
  if (isIngestion) {
    switch (ingestionType) {
      case IngestionPipelineType.Usage: {
        guide = addUsageIngestionGuide.find((item) => item.step === step);

        break;
      }
      case IngestionPipelineType.Lineage: {
        guide = addLineageIngestionGuide.find((item) => item.step === step);

        break;
      }
      case IngestionPipelineType.Profiler: {
        guide = addProfilerIngestionGuide.find((item) => item.step === step);

        break;
      }
      case IngestionPipelineType.Metadata:
      default: {
        guide = addMetadataIngestionGuide.find((item) => item.step === step);

        break;
      }
    }
  } else {
    guide =
      !isAirflowSetup && step === 4
        ? addServiceGuideWOAirflow
        : addServiceGuide.find((item) => item.step === step);
  }

  const getTitle = (title: string) => {
    const update = showDeployTitle
      ? title.replace('Added', 'Updated & Deployed')
      : title.replace('Added', 'Updated');
    const newTitle = showDeployTitle
      ? title.replace('Added', 'Added & Deployed')
      : title;

    return isUpdated ? update : newTitle;
  };

  return (
    <>
      {guide && (
        <>
          <h6 className="tw-heading tw-text-base">{getTitle(guide.title)}</h6>
          <div className="tw-mb-5">
            {isIngestion
              ? getFormattedGuideText(
                  guide.description,
                  '<Ingestion Pipeline Name>',
                  `${ingestionName}`
                )
              : getFormattedGuideText(
                  guide.description,
                  '<Service Name>',
                  serviceName
                )}
          </div>
        </>
      )}
    </>
  );
};

export const getIngestionName = (
  serviceName: string,
  type: IngestionPipelineType
) => {
  if (
    [IngestionPipelineType.Profiler, IngestionPipelineType.Metadata].includes(
      type
    )
  ) {
    return `${serviceName}_${type}_${cryptoRandomString({
      length: 8,
      type: 'alphanumeric',
    })}`;
  } else {
    return `${serviceName}_${type}`;
  }
};

export const shouldTestConnection = (serviceType: string) => {
  return serviceType !== DatabaseServiceType.SampleData;
};

export const getTestConnectionType = (serviceCat: ServiceCategory) => {
  switch (serviceCat) {
    case ServiceCategory.MESSAGING_SERVICES:
      return ConnectionType.Messaging;
    case ServiceCategory.DASHBOARD_SERVICES:
      return ConnectionType.Dashboard;
    case ServiceCategory.PIPELINE_SERVICES:
      return ConnectionType.Pipeline;
    case ServiceCategory.DATABASE_SERVICES:
    default:
      return ConnectionType.Database;
  }
};

export const getServiceCreatedLabel = (serviceCategory: ServiceCategory) => {
  let serviceCat;
  switch (serviceCategory) {
    case ServiceCategory.DATABASE_SERVICES:
      serviceCat = 'database';

      break;
    case ServiceCategory.MESSAGING_SERVICES:
      serviceCat = 'messaging';

      break;
    case ServiceCategory.DASHBOARD_SERVICES:
      serviceCat = 'dashboard';

      break;

    case ServiceCategory.PIPELINE_SERVICES:
      serviceCat = 'pipeline';

      break;
    default:
      serviceCat = '';

      break;
  }

  return [serviceCat, 'service'].join(' ');
};

export const setServiceSchemaCount = (
  data: Database[],
  callback: (value: React.SetStateAction<number>) => void
) => {
  const promises = data.map((database) =>
    getEntityCount('databaseSchemas', database.fullyQualifiedName)
  );

  Promise.allSettled(promises)
    .then((results) => {
      let count = 0;
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          count += result.value.data?.paging?.total || 0;
        }
      });
      callback(count);
    })
    .catch((err: AxiosError) => showErrorToast(err));
};

export const setServiceTableCount = (
  data: Database[],
  callback: (value: React.SetStateAction<number>) => void
) => {
  const promises = data.map((database) =>
    getEntityCount('tables', database.fullyQualifiedName)
  );

  Promise.allSettled(promises)
    .then((results) => {
      let count = 0;
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          count += result.value.data?.paging?.total || 0;
        }
      });
      callback(count);
    })
    .catch((err: AxiosError) => showErrorToast(err));
};

export const getOptionalFields = (
  service: ServicesType,
  serviceName: ServiceCategory
): JSX.Element => {
  switch (serviceName) {
    case ServiceCategory.MESSAGING_SERVICES: {
      const messagingService = service as MessagingService;

      return (
        <div className="tw-mb-1 tw-truncate" data-testid="additional-field">
          <label className="tw-mb-0">Brokers:</label>
          <span
            className=" tw-ml-1 tw-font-normal tw-text-grey-body"
            data-testid="brokers">
            {getBrokers(messagingService.connection?.config)}
          </span>
        </div>
      );
    }
    case ServiceCategory.DASHBOARD_SERVICES: {
      const dashboardService = service as DashboardService;

      return (
        <div className="tw-mb-1 tw-truncate" data-testid="additional-field">
          <label className="tw-mb-0">URL:</label>
          <span
            className=" tw-ml-1 tw-font-normal tw-text-grey-body"
            data-testid="dashboard-url">
            {getDashboardURL(dashboardService.connection?.config)}
          </span>
        </div>
      );
    }
    case ServiceCategory.PIPELINE_SERVICES: {
      const pipelineService = service as PipelineService;

      return (
        <div className="tw-mb-1 tw-truncate" data-testid="additional-field">
          <label className="tw-mb-0">URL:</label>
          <span
            className=" tw-ml-1 tw-font-normal tw-text-grey-body"
            data-testid="pipeline-url">
            {pipelineService.connection?.config?.hostPort || '--'}
          </span>
        </div>
      );
    }

    case ServiceCategory.ML_MODAL_SERVICES: {
      const mlmodel = service as MlmodelService;

      return (
        <>
          <div className="tw-mb-1 tw-truncate" data-testid="additional-field">
            <label className="tw-mb-0">Registry:</label>
            <span
              className=" tw-ml-1 tw-font-normal tw-text-grey-body"
              data-testid="pipeline-url">
              {mlmodel.connection?.config?.registryUri || '--'}
            </span>
          </div>
          <div className="tw-mb-1 tw-truncate" data-testid="additional-field">
            <label className="tw-mb-0">Tracking:</label>
            <span
              className=" tw-ml-1 tw-font-normal tw-text-grey-body"
              data-testid="pipeline-url">
              {mlmodel.connection?.config?.trackingUri || '--'}
            </span>
          </div>
        </>
      );
    }
    default: {
      return <></>;
    }
  }
};

export const getDeleteEntityMessage = (
  serviceName: string,
  instanceCount: number,
  schemaCount: number,
  tableCount: number
) => {
  const service = serviceName?.slice(0, -1);

  switch (serviceName) {
    case ServiceCategory.DATABASE_SERVICES:
      return getEntityDeleteMessage(
        service || 'Service',
        `${pluralize(instanceCount, 'Database')}, ${pluralize(
          schemaCount,
          'Schema'
        )} and ${pluralize(tableCount, 'Table')}`
      );

    case ServiceCategory.MESSAGING_SERVICES:
      return getEntityDeleteMessage(
        service || 'Service',
        pluralize(instanceCount, 'Topic')
      );

    case ServiceCategory.DASHBOARD_SERVICES:
      return getEntityDeleteMessage(
        service || 'Service',
        pluralize(instanceCount, 'Dashboard')
      );

    case ServiceCategory.PIPELINE_SERVICES:
      return getEntityDeleteMessage(
        service || 'Service',
        pluralize(instanceCount, 'Pipeline')
      );

    default:
      return;
  }
};

export const getServiceRouteFromServiceType = (type: ServiceTypes) => {
  if (type === 'messagingServices') {
    return GlobalSettingOptions.MESSAGING;
  }
  if (type === 'dashboardServices') {
    return GlobalSettingOptions.DASHBOARDS;
  }
  if (type === 'pipelineServices') {
    return GlobalSettingOptions.PIPELINES;
  }
  if (type === 'mlmodelServices') {
    return GlobalSettingOptions.MLMODELS;
  }

  return GlobalSettingOptions.DATABASES;
};

export const getResourceEntityFromServiceCategory = (
  category: string | ServiceCategory
) => {
  switch (category) {
    case 'dashboards':
    case ServiceCategory.DASHBOARD_SERVICES:
      return ResourceEntity.DASHBOARD_SERVICE;

    case 'databases':
    case ServiceCategory.DATABASE_SERVICES:
      return ResourceEntity.DATABASE_SERVICE;

    case 'mlModels':
    case ServiceCategory.ML_MODAL_SERVICES:
      return ResourceEntity.ML_MODEL_SERVICE;

    case 'messaging':
    case ServiceCategory.MESSAGING_SERVICES:
      return ResourceEntity.MESSAGING_SERVICE;

    case 'pipelines':
    case ServiceCategory.PIPELINE_SERVICES:
      return ResourceEntity.PIPELINE_SERVICE;
  }

  return ResourceEntity.DATABASE_SERVICE;
};

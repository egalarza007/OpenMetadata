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

import { Button, Card } from 'antd';
import { isNil } from 'lodash';
import React, { FunctionComponent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getExplorePathWithSearch,
  TITLE_FOR_NON_ADMIN_ACTION,
} from '../../constants/constants';
import {
  GlobalSettingOptions,
  GlobalSettingsMenuCategory,
} from '../../constants/globalSettings.constants';
import { getCountBadge } from '../../utils/CommonUtils';
import { getSettingPath } from '../../utils/RouterUtils';
import SVGIcons, { Icons } from '../../utils/SvgUtils';
import NonAdminAction from '../common/non-admin-action/NonAdminAction';
import { leftPanelAntCardStyle } from '../containers/PageLayout';
import { MyAssetStatsProps, Summary } from './MyAssetStats.interface';

const MyAssetStats: FunctionComponent<MyAssetStatsProps> = ({
  entityCounts,
}: MyAssetStatsProps) => {
  const [dataSummary, setdataSummary] = useState<Record<string, Summary>>({});

  const getSummarydata = () => {
    return {
      tables: {
        icon: Icons.TABLE_GREY,
        data: 'Tables',
        count: entityCounts.tableCount,
        link: getExplorePathWithSearch(undefined, 'tables'),
        dataTestId: 'tables',
      },
      topics: {
        icon: Icons.TOPIC_GREY,
        data: 'Topics',
        count: entityCounts.topicCount,
        link: getExplorePathWithSearch(undefined, 'topics'),
        dataTestId: 'topics',
      },
      dashboards: {
        icon: Icons.DASHBOARD_GREY,
        data: 'Dashboards',
        count: entityCounts.dashboardCount,
        link: getExplorePathWithSearch(undefined, 'dashboards'),
        dataTestId: 'dashboards',
      },
      pipelines: {
        icon: Icons.PIPELINE_GREY,
        data: 'Pipelines',
        count: entityCounts.pipelineCount,
        link: getExplorePathWithSearch(undefined, 'pipelines'),
        dataTestId: 'pipelines',
      },
      mlModal: {
        icon: Icons.MLMODAL,
        data: 'ML Models',
        count: entityCounts.mlmodelCount,
        link: getExplorePathWithSearch(undefined, 'mlmodels'),
        dataTestId: 'mlmodels',
      },
      testSuite: {
        icon: Icons.TEST_SUITE,
        data: 'Test Suite',
        count: entityCounts.testSuiteCount,
        link: getSettingPath(
          GlobalSettingsMenuCategory.DATA_QUALITY,
          GlobalSettingOptions.TEST_SUITE
        ),
        dataTestId: 'test-suite',
      },
      service: {
        icon: Icons.SERVICE,
        data: 'Services',
        count: entityCounts.servicesCount,
        link: getSettingPath(
          GlobalSettingsMenuCategory.SERVICES,
          GlobalSettingOptions.DATABASES
        ),
        dataTestId: 'service',
      },
      user: {
        icon: Icons.USERS,
        data: 'Users',
        count: entityCounts.userCount,
        link: getSettingPath(
          GlobalSettingsMenuCategory.MEMBERS,
          GlobalSettingOptions.USERS
        ),
        dataTestId: 'user',
        adminOnly: true,
      },
      teams: {
        icon: Icons.TEAMS_GREY,
        data: 'Teams',
        count: entityCounts.teamCount,
        link: getSettingPath(
          GlobalSettingsMenuCategory.MEMBERS,
          GlobalSettingOptions.TEAMS
        ),
        dataTestId: 'terms',
      },
    };
  };

  useEffect(() => {
    setdataSummary(getSummarydata());
  }, []);

  return (
    <div className="ant-entity-card">
      <Card
        data-testid="data-summary-container"
        id="assetStatsCount"
        style={leftPanelAntCardStyle}>
        {Object.values(dataSummary).map((data, index) => (
          <div
            className="tw-flex tw-items-center tw-justify-between"
            data-testid={`${data.dataTestId}-summary`}
            key={index}>
            <div className="tw-flex">
              <SVGIcons
                alt="icon"
                className="tw-h-4 tw-w-4 tw-self-center"
                icon={data.icon}
              />
              {data.link ? (
                data.adminOnly ? (
                  <NonAdminAction
                    position="bottom"
                    title={TITLE_FOR_NON_ADMIN_ACTION}>
                    <Link
                      className="tw-font-medium hover:tw-text-primary-hover hover:tw-underline"
                      data-testid={data.dataTestId}
                      to={data.link}>
                      <Button
                        className="tw-text-grey-body hover:tw-text-primary-hover hover:tw-underline"
                        type="text">
                        {data.data}
                      </Button>
                    </Link>
                  </NonAdminAction>
                ) : (
                  <Link
                    className="tw-font-medium hover:tw-text-primary-hover hover:tw-underline"
                    data-testid={data.dataTestId}
                    to={data.link}>
                    <Button
                      className="tw-text-grey-body hover:tw-text-primary-hover hover:tw-underline"
                      type="text">
                      {data.data}
                    </Button>
                  </Link>
                )
              ) : (
                <p className="tw-text-grey-body tw-pl-2">{data.data}</p>
              )}
            </div>
            {!isNil(data.count) && getCountBadge(data.count, '', false)}
          </div>
        ))}
      </Card>
    </div>
  );
};

export default MyAssetStats;

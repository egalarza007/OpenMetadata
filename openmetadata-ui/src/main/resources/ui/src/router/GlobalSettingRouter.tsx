/*
 *  Copyright 2022 Collate
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

import React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { usePermissionProvider } from '../components/PermissionProvider/PermissionProvider';
import { ResourceEntity } from '../components/PermissionProvider/PermissionProvider.interface';
import {
  GlobalSettingOptions,
  GlobalSettingsMenuCategory,
} from '../constants/globalSettings.constants';
import { Operation } from '../generated/entity/policies/policy';
import { TeamType } from '../generated/entity/teams/team';
import TeamsPage from '../pages/teams/TeamsPage';
import { checkPermission } from '../utils/PermissionsUtils';
import { getSettingCategoryPath, getSettingPath } from '../utils/RouterUtils';
import AdminProtectedRoute from './AdminProtectedRoute';
import withSuspenseFallback from './withSuspenseFallback';

const WebhooksPageV1 = withSuspenseFallback(
  React.lazy(() => import('../pages/WebhooksPage/WebhooksPageV1.component'))
);
const ServicesPage = withSuspenseFallback(
  React.lazy(() => import('../pages/services/ServicesPage'))
);
const BotsPageV1 = withSuspenseFallback(
  React.lazy(() => import('../pages/BotsPageV1/BotsPageV1.component'))
);
const CustomPropertiesPageV1 = withSuspenseFallback(
  React.lazy(
    () => import('../pages/CustomPropertiesPageV1/CustomPropertiesPageV1')
  )
);
const RolesListPage = withSuspenseFallback(
  React.lazy(() => import('../pages/RolesPage/RolesListPage/RolesListPage'))
);
const RolesDetailPage = withSuspenseFallback(
  React.lazy(() => import('../pages/RolesPage/RolesDetailPage/RolesDetailPage'))
);

const PoliciesDetailPage = withSuspenseFallback(
  React.lazy(
    () => import('../pages/PoliciesPage/PoliciesDetailPage/PoliciesDetailPage')
  )
);
const PoliciesListPage = withSuspenseFallback(
  React.lazy(
    () => import('../pages/PoliciesPage/PoliciesListPage/PoliciesListPage')
  )
);

const UserListPageV1 = withSuspenseFallback(
  React.lazy(() => import('../pages/UserListPage/UserListPageV1'))
);
const SlackSettingsPage = withSuspenseFallback(
  React.lazy(
    () => import('../pages/SlackSettingsPage/SlackSettingsPage.component')
  )
);
const TestSuitePage = withSuspenseFallback(
  React.lazy(() => import('../pages/TestSuitePage/TestSuitePage'))
);
const MsTeamsPage = withSuspenseFallback(
  React.lazy(() => import('../pages/MsTeamsPage/MsTeamsPage.component'))
);

const GlobalSettingRouter = () => {
  const { permissions } = usePermissionProvider();

  return (
    <Switch>
      <Route exact path={getSettingPath()}>
        <Redirect
          to={`${getSettingPath(
            GlobalSettingsMenuCategory.MEMBERS,
            GlobalSettingOptions.TEAMS
          )}/${TeamType.Organization}`}
        />
      </Route>
      <Route
        exact
        component={TeamsPage}
        path={getSettingPath(
          GlobalSettingsMenuCategory.MEMBERS,
          GlobalSettingOptions.TEAMS
        )}
      />
      <Route
        exact
        component={TeamsPage}
        path={getSettingPath(
          GlobalSettingsMenuCategory.MEMBERS,
          GlobalSettingOptions.TEAMS,
          true
        )}
      />
      <Route
        exact
        component={TestSuitePage}
        path={getSettingPath(
          GlobalSettingsMenuCategory.DATA_QUALITY,
          GlobalSettingOptions.TEST_SUITE
        )}
      />
      {/* Roles route start
       * Do not change the order of these route
       */}
      <AdminProtectedRoute
        exact
        component={RolesListPage}
        hasPermission={checkPermission(
          Operation.ViewAll,
          ResourceEntity.ROLE,
          permissions
        )}
        path={getSettingPath(
          GlobalSettingsMenuCategory.ACCESS,
          GlobalSettingOptions.ROLES
        )}
      />

      <AdminProtectedRoute
        exact
        component={RolesDetailPage}
        hasPermission={checkPermission(
          Operation.ViewAll,
          ResourceEntity.ROLE,
          permissions
        )}
        path={getSettingPath(
          GlobalSettingsMenuCategory.ACCESS,
          GlobalSettingOptions.ROLES,
          true
        )}
      />
      {/* Roles route end
       * Do not change the order of these route
       */}

      <AdminProtectedRoute
        exact
        component={PoliciesListPage}
        hasPermission={checkPermission(
          Operation.ViewAll,
          ResourceEntity.POLICY,
          permissions
        )}
        path={getSettingPath(
          GlobalSettingsMenuCategory.ACCESS,
          GlobalSettingOptions.POLICIES
        )}
      />
      <AdminProtectedRoute
        exact
        component={PoliciesDetailPage}
        hasPermission={checkPermission(
          Operation.ViewAll,
          ResourceEntity.POLICY,
          permissions
        )}
        path={getSettingPath(
          GlobalSettingsMenuCategory.ACCESS,
          GlobalSettingOptions.POLICIES,
          true
        )}
      />
      <AdminProtectedRoute
        exact
        component={UserListPageV1}
        hasPermission={checkPermission(
          Operation.ViewAll,
          ResourceEntity.USER,
          permissions
        )}
        path={getSettingCategoryPath(GlobalSettingsMenuCategory.MEMBERS)}
      />

      <AdminProtectedRoute
        exact
        component={WebhooksPageV1}
        hasPermission={checkPermission(
          Operation.ViewAll,
          ResourceEntity.WEBHOOK,
          permissions
        )}
        path={getSettingPath(
          GlobalSettingsMenuCategory.INTEGRATIONS,
          GlobalSettingOptions.WEBHOOK
        )}
      />
      <AdminProtectedRoute
        exact
        component={BotsPageV1}
        hasPermission={checkPermission(
          Operation.ViewAll,
          ResourceEntity.BOT,
          permissions
        )}
        path={getSettingPath(
          GlobalSettingsMenuCategory.INTEGRATIONS,
          GlobalSettingOptions.BOTS
        )}
      />

      <AdminProtectedRoute
        exact
        component={SlackSettingsPage}
        hasPermission={checkPermission(
          Operation.ViewAll,
          ResourceEntity.WEBHOOK,
          permissions
        )}
        path={getSettingPath(
          GlobalSettingsMenuCategory.INTEGRATIONS,
          GlobalSettingOptions.SLACK
        )}
      />

      <AdminProtectedRoute
        exact
        component={MsTeamsPage}
        hasPermission={checkPermission(
          Operation.ViewAll,
          ResourceEntity.WEBHOOK,
          permissions
        )}
        path={getSettingPath(
          GlobalSettingsMenuCategory.INTEGRATIONS,
          GlobalSettingOptions.MSTEAMS
        )}
      />

      <Route
        exact
        component={ServicesPage}
        path={getSettingCategoryPath(GlobalSettingsMenuCategory.SERVICES)}
      />

      <AdminProtectedRoute
        exact
        component={CustomPropertiesPageV1}
        hasPermission={checkPermission(
          Operation.ViewAll,
          ResourceEntity.ALL,
          permissions
        )}
        path={getSettingCategoryPath(
          GlobalSettingsMenuCategory.CUSTOM_ATTRIBUTES
        )}
      />
    </Switch>
  );
};

export default GlobalSettingRouter;

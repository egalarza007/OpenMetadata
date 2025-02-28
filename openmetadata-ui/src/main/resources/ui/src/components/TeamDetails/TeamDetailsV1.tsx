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

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Button as ButtonAntd,
  Col,
  Empty,
  Modal,
  Row,
  Space,
  Switch,
  Table,
  Tooltip,
  Typography,
} from 'antd';
import { ColumnsType } from 'antd/lib/table';
import { AxiosError } from 'axios';
import classNames from 'classnames';
import { compare } from 'fast-json-patch';
import { cloneDeep, isEmpty, isUndefined, orderBy } from 'lodash';
import { ExtraInfo } from 'Models';
import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppState from '../../AppState';
import {
  getTeamAndUserDetailsPath,
  getUserPath,
  PAGE_SIZE,
} from '../../constants/constants';
import {
  GlobalSettingOptions,
  GlobalSettingsMenuCategory,
} from '../../constants/globalSettings.constants';
import {
  NO_PERMISSION_FOR_ACTION,
  NO_PERMISSION_TO_VIEW,
} from '../../constants/HelperTextUtil';
import { EntityType } from '../../enums/entity.enum';
import { OwnerType } from '../../enums/user.enum';
import { Operation } from '../../generated/entity/policies/policy';
import { Team, TeamType } from '../../generated/entity/teams/team';
import {
  EntityReference as UserTeams,
  User,
} from '../../generated/entity/teams/user';
import { EntityReference } from '../../generated/type/entityReference';
import { TeamDetailsProp } from '../../interface/teamsAndUsers.interface';
import jsonData from '../../jsons/en';
import AddAttributeModal from '../../pages/RolesPage/AddAttributeModal/AddAttributeModal';
import UserCard from '../../pages/teams/UserCard';
import {
  getEntityName,
  getTeamsText,
  hasEditAccess,
} from '../../utils/CommonUtils';
import { filterEntityAssets } from '../../utils/EntityUtils';
import { checkPermission } from '../../utils/PermissionsUtils';
import { getSettingPath, getTeamsWithFqnPath } from '../../utils/RouterUtils';
import SVGIcons, { Icons } from '../../utils/SvgUtils';
import { showErrorToast } from '../../utils/ToastUtils';
import { Button } from '../buttons/Button/Button';
import Description from '../common/description/Description';
import Ellipses from '../common/Ellipses/Ellipses';
import ManageButton from '../common/entityPageInfo/ManageButton/ManageButton';
import EntitySummaryDetails from '../common/EntitySummaryDetails/EntitySummaryDetails';
import ErrorPlaceHolder from '../common/error-with-placeholder/ErrorPlaceHolder';
import NextPrevious from '../common/next-previous/NextPrevious';
import Searchbar from '../common/searchbar/Searchbar';
import TabsPane from '../common/TabsPane/TabsPane';
import TitleBreadcrumb from '../common/title-breadcrumb/title-breadcrumb.component';
import { TitleBreadcrumbProps } from '../common/title-breadcrumb/title-breadcrumb.interface';
import Loader from '../Loader/Loader';
import ConfirmationModal from '../Modals/ConfirmationModal/ConfirmationModal';
import { usePermissionProvider } from '../PermissionProvider/PermissionProvider';
import {
  OperationPermission,
  ResourceEntity,
} from '../PermissionProvider/PermissionProvider.interface';
import ListEntities from './RolesAndPoliciesList';
import { getTabs } from './TeamDetailsV1.utils';
import TeamHierarchy from './TeamHierarchy';
import './teams.less';
interface AddAttribute {
  type: EntityType;
  selectedData: EntityReference[];
}

const TeamDetailsV1 = ({
  hasAccess,
  currentTeam,
  currentTeamUsers,
  teamUserPagin,
  currentTeamUserPage,
  teamUsersSearchText,
  isDescriptionEditable,
  isTeamMemberLoading,
  childTeams,
  onTeamExpand,
  handleAddTeam,
  updateTeamHandler,
  onDescriptionUpdate,
  descriptionHandler,
  handleTeamUsersSearchAction,
  teamUserPaginHandler,
  handleJoinTeamClick,
  handleLeaveTeamClick,
  handleAddUser,
  removeUserFromTeam,
  afterDeleteAction,
}: TeamDetailsProp) => {
  const isOrganization = currentTeam.name === TeamType.Organization;
  const DELETE_USER_INITIAL_STATE = {
    user: undefined,
    state: false,
    leave: false,
  };
  const { permissions, getEntityPermission } = usePermissionProvider();
  const [currentTab, setCurrentTab] = useState(1);
  const [isHeadingEditing, setIsHeadingEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState<User>();
  const [heading, setHeading] = useState(
    currentTeam ? currentTeam.displayName : ''
  );
  const [deletingUser, setDeletingUser] = useState<{
    user: UserTeams | undefined;
    state: boolean;
    leave: boolean;
  }>(DELETE_USER_INITIAL_STATE);
  const [searchTerm, setSearchTerm] = useState('');
  const [table, setTable] = useState<Team[]>([]);
  const [slashedDatabaseName, setSlashedDatabaseName] = useState<
    TitleBreadcrumbProps['titleLinks']
  >([]);
  const [addAttribute, setAddAttribute] = useState<AddAttribute>();
  const [selectedEntity, setEntity] = useState<{
    attribute: 'defaultRoles' | 'policies';
    record: EntityReference;
  }>();
  const [entityPermissions, setEntityPermissions] =
    useState<OperationPermission>({} as OperationPermission);

  const createTeamPermission = useMemo(
    () =>
      !isEmpty(permissions) &&
      checkPermission(Operation.Create, ResourceEntity.TEAM, permissions),
    [permissions]
  );

  /**
   * Check if current team is the owner or not
   * @returns - True true or false based on hasEditAccess response
   */
  const isOwner = () => {
    return hasEditAccess(
      currentTeam?.owner?.type || '',
      currentTeam?.owner?.id || ''
    );
  };

  /**
   * Take user id as input to find out the user data and set it for delete
   * @param id - user id
   * @param leave - if "Leave Team" action is in progress
   */
  const deleteUserHandler = (id: string, leave = false) => {
    const user = [...(currentTeam?.users as Array<UserTeams>)].find(
      (u) => u.id === id
    );
    setDeletingUser({ user, state: true, leave });
  };

  const columns: ColumnsType<User> = useMemo(() => {
    return [
      {
        title: 'Username',
        dataIndex: 'username',
        key: 'username',
        render: (_, record) => (
          <Link
            className="hover:tw-underline tw-cursor-pointer"
            to={getUserPath(record.fullyQualifiedName || record.name)}>
            {getEntityName(record)}
          </Link>
        ),
      },
      {
        title: 'Email',
        dataIndex: 'email',
        key: 'email',
      },
      {
        title: 'Teams',
        dataIndex: 'teams',
        key: 'teams',
        render: (teams: EntityReference[]) => getTeamsText(teams),
      },
      {
        title: 'Actions',
        dataIndex: 'actions',
        key: 'actions',
        width: 90,
        render: (_, record) => (
          <Space
            align="center"
            className="tw-w-full tw-justify-center remove-icon"
            size={8}>
            <Tooltip
              placement="bottomRight"
              title={
                entityPermissions?.EditAll ? 'Remove' : NO_PERMISSION_FOR_ACTION
              }>
              <ButtonAntd
                disabled={!entityPermissions?.EditAll}
                icon={
                  <SVGIcons
                    alt="Remove"
                    className="tw-w-4 tw-mb-2.5"
                    icon={Icons.ICON_REMOVE}
                  />
                }
                type="text"
                onClick={() => deleteUserHandler(record.id)}
              />
            </Tooltip>
          </Space>
        ),
      },
    ];
  }, [deleteUserHandler]);

  const extraInfo: ExtraInfo = {
    key: 'Owner',
    value:
      currentTeam?.owner?.type === 'team'
        ? getTeamAndUserDetailsPath(
            currentTeam?.owner?.displayName || currentTeam?.owner?.name || ''
          )
        : currentTeam?.owner?.displayName || currentTeam?.owner?.name || '',
    placeholderText:
      currentTeam?.owner?.displayName || currentTeam?.owner?.name || '',
    isLink: currentTeam?.owner?.type === 'team',
    openInNewTab: false,
    profileName:
      currentTeam?.owner?.type === OwnerType.USER
        ? currentTeam?.owner?.name
        : undefined,
  };

  const isActionAllowed = (operation = false) => {
    return hasAccess || isOwner() || operation;
  };

  const handleOpenToJoinToggle = (value: boolean) => {
    if (currentTeam) {
      const updatedData: Team = {
        ...currentTeam,
        isJoinable: value,
      };
      updateTeamHandler(updatedData);
    }
  };

  const isAlreadyJoinedTeam = (teamId: string) => {
    if (currentUser) {
      return currentUser.teams?.find((team) => team.id === teamId);
    }

    return false;
  };

  const handleHeadingSave = () => {
    if (heading && currentTeam) {
      const updatedData: Team = {
        ...currentTeam,
        displayName: heading,
      };

      updateTeamHandler(updatedData);
      setIsHeadingEditing(false);
    }
  };

  const joinTeam = () => {
    if (currentUser && currentTeam) {
      const newTeams = cloneDeep(currentUser.teams ?? []);
      newTeams.push({
        id: currentTeam.id,
        type: OwnerType.TEAM,
        name: currentTeam.name,
      });

      const updatedData: User = {
        ...currentUser,
        teams: newTeams,
      };

      const options = compare(currentUser, updatedData);

      handleJoinTeamClick(currentUser.id, options);
    }
  };

  const leaveTeam = (): Promise<void> => {
    if (currentUser && currentTeam) {
      let newTeams = cloneDeep(currentUser.teams ?? []);
      newTeams = newTeams.filter((team) => team.id !== currentTeam.id);

      const updatedData: User = {
        ...currentUser,
        teams: newTeams,
      };

      const options = compare(currentUser, updatedData);

      return handleLeaveTeamClick(currentUser.id, options);
    }

    return Promise.reject();
  };

  const handleRemoveUser = () => {
    if (deletingUser.leave) {
      leaveTeam().then(() => {
        setDeletingUser(DELETE_USER_INITIAL_STATE);
      });
    } else {
      removeUserFromTeam(deletingUser.user?.id as string).then(() => {
        setDeletingUser(DELETE_USER_INITIAL_STATE);
      });
    }
  };

  const updateOwner = (owner?: EntityReference) => {
    if (currentTeam) {
      const updatedData: Team = {
        ...currentTeam,
        owner: !isUndefined(owner) ? owner : currentTeam.owner,
      };

      return updateTeamHandler(updatedData);
    }

    return Promise.reject();
  };

  const handleTeamSearch = (value: string) => {
    setSearchTerm(value);
    if (value) {
      setTable(
        childTeams?.filter(
          (team) =>
            team?.name?.toLowerCase().includes(value.toLowerCase()) ||
            team?.displayName?.toLowerCase().includes(value.toLowerCase())
        ) || []
      );
    } else {
      setTable(childTeams ?? []);
    }
  };

  const handleAddAttribute = (selectedIds: string[]) => {
    if (addAttribute) {
      let updatedTeamData = { ...currentTeam };
      const updatedData = selectedIds.map((id) => {
        const existingData = addAttribute.selectedData.find(
          (data) => data.id === id
        );

        return existingData ? existingData : { id, type: addAttribute.type };
      });

      switch (addAttribute.type) {
        case EntityType.ROLE:
          updatedTeamData = { ...updatedTeamData, defaultRoles: updatedData };

          break;

        case EntityType.POLICY:
          updatedTeamData = { ...updatedTeamData, policies: updatedData };

          break;

        default:
          break;
      }
      updateTeamHandler(updatedTeamData);
    }
  };

  const handleAttributeDelete = (
    record: EntityReference,
    attribute: 'defaultRoles' | 'policies'
  ) => {
    const attributeData =
      (currentTeam[attribute as keyof Team] as EntityReference[]) ?? [];
    const updatedAttributeData = attributeData.filter(
      (attrData) => attrData.id !== record.id
    );

    const updatedTeamData = {
      ...currentTeam,
      [attribute]: updatedAttributeData,
    };
    updateTeamHandler(updatedTeamData);
  };

  const fetchPermissions = async () => {
    try {
      const perms = await getEntityPermission(
        ResourceEntity.TEAM,
        currentTeam.id
      );
      setEntityPermissions(perms);
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        jsonData['api-error-messages']['fetch-user-permission-error']
      );
    }
  };

  useEffect(() => {
    !isEmpty(currentTeam) && fetchPermissions();
  }, [currentTeam]);

  useEffect(() => {
    if (currentTeam) {
      const perents =
        currentTeam?.parents && !isOrganization
          ? currentTeam?.parents.map((parent) => ({
              name: getEntityName(parent),
              url: getTeamsWithFqnPath(
                parent.name || parent.fullyQualifiedName || ''
              ),
            }))
          : [];
      const breadcrumb = [
        {
          name: 'Team',
          url: getSettingPath(
            GlobalSettingsMenuCategory.MEMBERS,
            GlobalSettingOptions.TEAMS
          ),
        },
        ...perents,
        {
          name: getEntityName(currentTeam),
          url: '',
        },
      ];
      setSlashedDatabaseName(breadcrumb);
      setHeading(currentTeam.displayName || currentTeam.name);
    }
  }, [currentTeam]);

  useEffect(() => {
    setTable(childTeams ?? []);
  }, [childTeams]);

  useEffect(() => {
    setCurrentUser(AppState.getCurrentUserDetails());
  }, [currentTeam, AppState.userDetails, AppState.nonSecureUserDetails]);

  const removeUserBodyText = (leave: boolean) => {
    const text = leave
      ? `leave the team ${currentTeam?.displayName ?? currentTeam?.name}?`
      : `remove ${deletingUser.user?.displayName ?? deletingUser.user?.name}?`;

    return `Are you sure you want to ${text}`;
  };

  /**
   * Check for current team users and return the user cards
   * @returns - user cards
   */
  const getUserCards = () => {
    const sortedUser = orderBy(currentTeamUsers || [], ['name'], 'asc');

    return (
      <div>
        <div className="tw-flex tw-justify-between tw-items-center tw-mb-3">
          <div className="tw-w-4/12">
            <Searchbar
              removeMargin
              placeholder="Search for user..."
              searchValue={teamUsersSearchText}
              typingInterval={500}
              onSearch={handleTeamUsersSearchAction}
            />
          </div>

          {currentTeamUsers.length > 0 && isActionAllowed() && (
            <div>
              <Button
                className="tw-h-8 tw-px-2"
                data-testid="add-user"
                disabled={!entityPermissions?.EditAll}
                size="small"
                theme="primary"
                title={
                  entityPermissions?.EditAll
                    ? 'Add User'
                    : NO_PERMISSION_FOR_ACTION
                }
                variant="contained"
                onClick={() => {
                  handleAddUser(true);
                }}>
                Add User
              </Button>
            </div>
          )}
        </div>
        {isTeamMemberLoading ? (
          <Loader />
        ) : (
          <div>
            {currentTeamUsers.length <= 0 ? (
              <div className="tw-flex tw-flex-col tw-items-center tw-place-content-center tw-mt-40 tw-gap-1">
                <p>
                  There are no users{' '}
                  {teamUsersSearchText
                    ? `as ${teamUsersSearchText}.`
                    : `added yet.`}
                </p>
                <p>Would like to start adding some?</p>
                <Button
                  className="tw-h-8 tw-rounded tw-my-2"
                  data-testid="add-new-user"
                  disabled={!entityPermissions?.EditAll}
                  size="small"
                  theme="primary"
                  title={
                    entityPermissions?.EditAll
                      ? 'Add New User'
                      : NO_PERMISSION_FOR_ACTION
                  }
                  variant="contained"
                  onClick={() => handleAddUser(true)}>
                  Add new user
                </Button>
              </div>
            ) : (
              <Fragment>
                <Table
                  className="teams-list-table"
                  columns={columns}
                  dataSource={sortedUser}
                  pagination={false}
                  size="small"
                />
                {teamUserPagin.total > PAGE_SIZE && (
                  <NextPrevious
                    currentPage={currentTeamUserPage}
                    isNumberBased={Boolean(teamUsersSearchText)}
                    pageSize={PAGE_SIZE}
                    paging={teamUserPagin}
                    pagingHandler={teamUserPaginHandler}
                    totalCount={teamUserPagin.total}
                  />
                )}
              </Fragment>
            )}
          </div>
        )}
      </div>
    );
  };

  /**
   * Check for current team datasets and return the dataset cards
   * @returns - dataset cards
   */
  const getDatasetCards = () => {
    const ownData = filterEntityAssets(currentTeam?.owns || []);

    if (ownData.length <= 0) {
      return (
        <div className="tw-flex tw-flex-col tw-items-center tw-place-content-center tw-mt-40 tw-gap-1">
          <p>Your team does not have any assets</p>
          <p>Would like to start adding some?</p>
          <Link to="/explore">
            <Button
              className="tw-h-8 tw-rounded tw-mb-2 tw-text-white"
              size="small"
              theme="primary"
              variant="contained">
              Explore
            </Button>
          </Link>
        </div>
      );
    }

    return (
      <>
        <div
          className="tw-grid xxl:tw-grid-cols-4 md:tw-grid-cols-3 tw-gap-4"
          data-testid="dataset-card">
          {' '}
          {ownData.map((dataset, index) => {
            const Dataset = {
              displayName: dataset.displayName || dataset.name || '',
              type: dataset.type,
              fqn: dataset.fullyQualifiedName || '',
              id: dataset.id,
              name: dataset.name,
            };

            return (
              <UserCard isDataset isIconVisible item={Dataset} key={index} />
            );
          })}
        </div>
      </>
    );
  };

  const teamActionButton = (alreadyJoined: boolean, isJoinable: boolean) => {
    return alreadyJoined ? (
      isJoinable || hasAccess ? (
        <Button
          className="tw-h-8 tw-px-2"
          data-testid="join-teams"
          size="small"
          theme="primary"
          variant="contained"
          onClick={joinTeam}>
          Join Team
        </Button>
      ) : null
    ) : (
      <Button
        className="tw-h-8 tw-rounded"
        data-testid="leave-team-button"
        size="small"
        theme="primary"
        variant="outlined"
        onClick={() => currentUser && deleteUserHandler(currentUser.id, true)}>
        Leave Team
      </Button>
    );
  };

  const getTeamHeading = () => {
    return (
      <div className="tw-heading tw-text-link tw-text-base tw-mb-2">
        {isHeadingEditing ? (
          <div className="tw-flex tw-items-center tw-gap-1">
            <input
              className="tw-form-inputs tw-form-inputs-padding tw-py-0.5 tw-w-64"
              data-testid="synonyms"
              id="synonyms"
              name="synonyms"
              placeholder="Enter comma seprated term"
              type="text"
              value={heading}
              onChange={(e) => setHeading(e.target.value)}
            />
            <div className="tw-flex tw-justify-end" data-testid="buttons">
              <Button
                className="tw-px-1 tw-py-1 tw-rounded tw-text-sm tw-mr-1"
                data-testid="cancelAssociatedTag"
                size="custom"
                theme="primary"
                variant="contained"
                onMouseDown={() => setIsHeadingEditing(false)}>
                <FontAwesomeIcon className="tw-w-3.5 tw-h-3.5" icon="times" />
              </Button>
              <Button
                className="tw-px-1 tw-py-1 tw-rounded tw-text-sm"
                data-testid="saveAssociatedTag"
                size="custom"
                theme="primary"
                variant="contained"
                onMouseDown={handleHeadingSave}>
                <FontAwesomeIcon className="tw-w-3.5 tw-h-3.5" icon="check" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="tw-flex tw-group" data-testid="team-heading">
            <Ellipses tooltip rows={1}>
              {heading}
            </Ellipses>
            {isActionAllowed() && (
              <div className={classNames('tw-w-5 tw-min-w-max')}>
                <Tooltip
                  placement="bottomLeft"
                  title={
                    entityPermissions?.EditDisplayName
                      ? 'Edit Display Name'
                      : NO_PERMISSION_FOR_ACTION
                  }>
                  <button
                    className="tw-ml-2 focus:tw-outline-none"
                    data-testid="edit-synonyms"
                    disabled={!entityPermissions?.EditDisplayName}
                    onClick={() => setIsHeadingEditing(true)}>
                    <SVGIcons
                      alt="edit"
                      className="tw-mb-1"
                      icon="icon-edit"
                      width="16px"
                    />
                  </button>
                </Tooltip>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const viewPermission =
    !isEmpty(entityPermissions) && entityPermissions.ViewAll;

  return viewPermission ? (
    <div
      className="tw-h-full tw-flex tw-flex-col tw-flex-grow"
      data-testid="team-details-container">
      {!isEmpty(currentTeam) ? (
        <Fragment>
          <TitleBreadcrumb titleLinks={slashedDatabaseName} />
          <div
            className="tw-flex tw-justify-between tw-items-center"
            data-testid="header">
            {getTeamHeading()}
            {!isOrganization && (
              <Space align="center">
                {!isUndefined(currentUser) &&
                  teamActionButton(
                    !isAlreadyJoinedTeam(currentTeam.id),
                    currentTeam.isJoinable || false
                  )}
                <ManageButton
                  afterDeleteAction={afterDeleteAction}
                  buttonClassName="tw-p-4"
                  disabled={!entityPermissions.EditAll}
                  entityId={currentTeam.id}
                  entityName={
                    currentTeam.fullyQualifiedName || currentTeam.name
                  }
                  entityType="team"
                  title={
                    entityPermissions.EditAll
                      ? 'Manage'
                      : NO_PERMISSION_FOR_ACTION
                  }
                />
              </Space>
            )}
          </div>
          {!isOrganization && (
            <div className="tw-mb-3">
              <Switch
                checked={currentTeam.isJoinable}
                className="tw-mr-2"
                size="small"
                title="Open Group"
                onChange={handleOpenToJoinToggle}
              />
              <span>Open Group</span>
            </div>
          )}
          <EntitySummaryDetails data={extraInfo} updateOwner={updateOwner} />
          <div
            className="tw-mb-3 tw--ml-5 tw-mt-2"
            data-testid="description-container">
            <Description
              description={currentTeam?.description || ''}
              entityName={currentTeam?.displayName ?? currentTeam?.name}
              hasEditAccess={entityPermissions.EditDescription}
              isEdit={isDescriptionEditable}
              onCancel={() => descriptionHandler(false)}
              onDescriptionEdit={() => descriptionHandler(true)}
              onDescriptionUpdate={onDescriptionUpdate}
            />
          </div>

          <div className="tw-flex tw-flex-col tw-flex-grow">
            <TabsPane
              activeTab={currentTab}
              setActiveTab={(tab) => setCurrentTab(tab)}
              tabs={getTabs(currentTeam, teamUserPagin, isOrganization)}
            />

            <div className="tw-flex-grow tw-flex tw-flex-col tw-pt-4">
              {currentTab === 1 && (
                <Row className="team-list-container" gutter={[16, 16]}>
                  <Col span={8}>
                    <Searchbar
                      removeMargin
                      placeholder="Search for team..."
                      searchValue={searchTerm}
                      typingInterval={500}
                      onSearch={handleTeamSearch}
                    />
                  </Col>
                  <Col span={16}>
                    <Space
                      align="end"
                      className="tw-w-full"
                      direction="vertical">
                      <ButtonAntd
                        disabled={!createTeamPermission}
                        title={
                          createTeamPermission
                            ? 'Add Team'
                            : NO_PERMISSION_FOR_ACTION
                        }
                        type="primary"
                        onClick={() => handleAddTeam(true)}>
                        Add Team
                      </ButtonAntd>
                    </Space>
                  </Col>
                  <Col span={24}>
                    <TeamHierarchy
                      data={table as Team[]}
                      onTeamExpand={onTeamExpand}
                    />
                  </Col>
                </Row>
              )}
              {currentTab === 2 && getUserCards()}

              {currentTab === 3 && getDatasetCards()}

              {currentTab === 4 && (
                <Space
                  className="tw-w-full roles-and-policy"
                  direction="vertical">
                  <ButtonAntd
                    data-testid="add-role"
                    disabled={!entityPermissions.EditAll}
                    title={
                      entityPermissions.EditAll
                        ? 'Add Role'
                        : NO_PERMISSION_FOR_ACTION
                    }
                    type="primary"
                    onClick={() =>
                      setAddAttribute({
                        type: EntityType.ROLE,
                        selectedData: currentTeam.defaultRoles || [],
                      })
                    }>
                    Add Role
                  </ButtonAntd>
                  <ListEntities
                    list={currentTeam.defaultRoles || []}
                    type={EntityType.ROLE}
                    onDelete={(record) =>
                      setEntity({ record, attribute: 'defaultRoles' })
                    }
                  />
                </Space>
              )}
              {currentTab === 5 && (
                <Space
                  className="tw-w-full roles-and-policy"
                  direction="vertical">
                  <ButtonAntd
                    data-testid="add-policy"
                    disabled={!entityPermissions.EditAll}
                    title={
                      entityPermissions.EditAll
                        ? 'Add Policy'
                        : NO_PERMISSION_FOR_ACTION
                    }
                    type="primary"
                    onClick={() =>
                      setAddAttribute({
                        type: EntityType.POLICY,
                        selectedData: currentTeam.policies || [],
                      })
                    }>
                    Add Policy
                  </ButtonAntd>
                  <ListEntities
                    list={currentTeam.policies || []}
                    type={EntityType.POLICY}
                    onDelete={(record) =>
                      setEntity({ record, attribute: 'policies' })
                    }
                  />
                </Space>
              )}
            </div>
          </div>
        </Fragment>
      ) : (
        <ErrorPlaceHolder>
          <p className="tw-text-lg tw-text-center">No Teams Added.</p>
          <div className="tw-text-lg tw-text-center">
            <Button
              disabled={!createTeamPermission}
              size="small"
              theme="primary"
              title={
                createTeamPermission ? 'Add Team' : NO_PERMISSION_FOR_ACTION
              }
              variant="outlined"
              onClick={() => handleAddTeam(true)}>
              Click here
            </Button>
            {' to add new Team'}
          </div>
        </ErrorPlaceHolder>
      )}

      {deletingUser.state && (
        <ConfirmationModal
          bodyText={removeUserBodyText(deletingUser.leave)}
          cancelText="Cancel"
          confirmText="Confirm"
          header={deletingUser.leave ? 'Leave team' : 'Removing user'}
          onCancel={() => setDeletingUser(DELETE_USER_INITIAL_STATE)}
          onConfirm={handleRemoveUser}
        />
      )}

      {addAttribute && (
        <AddAttributeModal
          isOpen={!isUndefined(addAttribute)}
          selectedKeys={addAttribute.selectedData.map((data) => data.id)}
          title={`Add ${addAttribute.type}`}
          type={addAttribute.type}
          onCancel={() => setAddAttribute(undefined)}
          onSave={(data) => handleAddAttribute(data)}
        />
      )}
      {selectedEntity && (
        <Modal
          centered
          okText="Confirm"
          title={`Remove ${getEntityName(
            selectedEntity.record
          )} from ${getEntityName(currentTeam)}`}
          visible={!isUndefined(selectedEntity.record)}
          onCancel={() => setEntity(undefined)}
          onOk={() => {
            handleAttributeDelete(
              selectedEntity.record,
              selectedEntity.attribute
            );
            setEntity(undefined);
          }}>
          <Typography.Text>
            Are you sure you want to remove the{' '}
            {`${getEntityName(selectedEntity.record)} from ${getEntityName(
              currentTeam
            )}?`}
          </Typography.Text>
        </Modal>
      )}
    </div>
  ) : (
    <Row align="middle" className="tw-h-full">
      <Col span={24}>
        <Empty description={NO_PERMISSION_TO_VIEW} />
      </Col>
    </Row>
  );
};

export default TeamDetailsV1;

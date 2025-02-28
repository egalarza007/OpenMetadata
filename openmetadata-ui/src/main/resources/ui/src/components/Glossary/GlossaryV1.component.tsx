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

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Button as ButtonAntd,
  Col,
  Dropdown,
  Input,
  Menu,
  Row,
  Space,
  Tooltip,
  Typography,
} from 'antd';
import { AxiosError } from 'axios';
import { cloneDeep, isEmpty } from 'lodash';
import { GlossaryTermAssets, LoadingState } from 'Models';
import RcTree from 'rc-tree';
import { DataNode, EventDataNode } from 'rc-tree/lib/interface';
import React, { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { FQN_SEPARATOR_CHAR } from '../../constants/char.constants';
import { NO_PERMISSION_FOR_ACTION } from '../../constants/HelperTextUtil';
import { Glossary } from '../../generated/entity/data/glossary';
import { GlossaryTerm } from '../../generated/entity/data/glossaryTerm';
import { Operation } from '../../generated/entity/policies/policy';
import { useAfterMount } from '../../hooks/useAfterMount';
import { ModifiedGlossaryData } from '../../pages/GlossaryPage/GlossaryPageV1.component';
import { getEntityDeleteMessage, getEntityName } from '../../utils/CommonUtils';
import { generateTreeData } from '../../utils/GlossaryUtils';
import { checkPermission } from '../../utils/PermissionsUtils';
import { getGlossaryPath } from '../../utils/RouterUtils';
import SVGIcons, { Icons } from '../../utils/SvgUtils';
import { showErrorToast } from '../../utils/ToastUtils';
import { Button } from '../buttons/Button/Button';
import ErrorPlaceHolder from '../common/error-with-placeholder/ErrorPlaceHolder';
import Searchbar from '../common/searchbar/Searchbar';
import TitleBreadcrumb from '../common/title-breadcrumb/title-breadcrumb.component';
import { TitleBreadcrumbProps } from '../common/title-breadcrumb/title-breadcrumb.interface';
import TreeView from '../common/TreeView/TreeView.component';
import PageLayout from '../containers/PageLayout';
import GlossaryDetails from '../GlossaryDetails/GlossaryDetails.component';
import GlossaryTermsV1 from '../GlossaryTerms/GlossaryTermsV1.component';
import Loader from '../Loader/Loader';
import EntityDeleteModal from '../Modals/EntityDeleteModal/EntityDeleteModal';
import { usePermissionProvider } from '../PermissionProvider/PermissionProvider';
import {
  OperationPermission,
  ResourceEntity,
} from '../PermissionProvider/PermissionProvider.interface';
import './GlossaryV1.style.less';
const { Title } = Typography;

type Props = {
  assetData: GlossaryTermAssets;
  deleteStatus: LoadingState;
  isSearchResultEmpty: boolean;
  glossaryList: ModifiedGlossaryData[];
  selectedKey: string;
  expandedKey: string[];
  loadingKey: string[];
  handleExpandedKey: (key: string[]) => void;
  handleSelectedKey?: (key: string) => void;
  searchText: string;
  selectedData: Glossary | GlossaryTerm;
  isGlossaryActive: boolean;
  currentPage: number;
  handleAddGlossaryClick: () => void;
  handleAddGlossaryTermClick: () => void;
  updateGlossary: (value: Glossary) => void;
  handleGlossaryTermUpdate: (value: GlossaryTerm) => void;
  handleSelectedData: (key: string) => void;
  handleChildLoading: (status: boolean) => void;
  handleSearchText: (text: string) => void;
  onGlossaryDelete: (id: string) => void;
  onGlossaryTermDelete: (id: string) => void;
  onAssetPaginate: (num: string | number, activePage?: number) => void;
  onRelatedTermClick?: (fqn: string) => void;
  handleUserRedirection?: (name: string) => void;
  isChildLoading: boolean;
};

const GlossaryV1 = ({
  assetData,
  deleteStatus = 'initial',
  isSearchResultEmpty,
  glossaryList,
  selectedKey,
  expandedKey,
  loadingKey,
  handleExpandedKey,
  handleUserRedirection,
  searchText,
  selectedData,
  isGlossaryActive,
  isChildLoading,
  handleSelectedData,
  handleAddGlossaryClick,
  handleAddGlossaryTermClick,
  handleGlossaryTermUpdate,
  updateGlossary,
  handleChildLoading,
  handleSearchText,
  onGlossaryDelete,
  onGlossaryTermDelete,
  onAssetPaginate,
  onRelatedTermClick,
  currentPage,
}: Props) => {
  const { getEntityPermission, permissions } = usePermissionProvider();
  const treeRef = useRef<RcTree<DataNode>>(null);
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<
    TitleBreadcrumbProps['titleLinks']
  >([]);
  const [showActions, setShowActions] = useState(false);
  const [isDelete, setIsDelete] = useState<boolean>(false);
  const [addTermButtonWidth, setAddTermButtonWidth] = useState(
    document.getElementById('add-term-button')?.offsetWidth || 0
  );
  const [manageButtonWidth, setManageButtonWidth] = useState(
    document.getElementById('manage-button')?.offsetWidth || 0
  );
  const [leftPanelWidth, setLeftPanelWidth] = useState(
    document.getElementById('glossary-left-panel')?.offsetWidth || 0
  );
  const [isNameEditing, setIsNameEditing] = useState(false);
  const [displayName, setDisplayName] = useState<string>();

  const [glossaryPermission, setGlossaryPermission] =
    useState<OperationPermission>({} as OperationPermission);

  const [glossaryTermPermission, setGlossaryTermPermission] =
    useState<OperationPermission>({} as OperationPermission);

  const fetchGlossaryPermission = async () => {
    try {
      const response = await getEntityPermission(
        ResourceEntity.GLOSSARY,
        selectedData?.id as string
      );
      setGlossaryPermission(response);
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  const fetchGlossaryTermPermission = async () => {
    try {
      const response = await getEntityPermission(
        ResourceEntity.GLOSSARY_TERM,
        selectedData?.id as string
      );
      setGlossaryTermPermission(response);
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  const createGlossaryPermission = useMemo(
    () =>
      checkPermission(Operation.Create, ResourceEntity.GLOSSARY, permissions),
    [permissions]
  );

  const createGlossaryTermPermission = useMemo(
    () =>
      checkPermission(
        Operation.Create,
        ResourceEntity.GLOSSARY_TERM,
        permissions
      ),
    [permissions]
  );

  const editDisplayNamePermission = useMemo(() => {
    return isGlossaryActive
      ? glossaryPermission.EditDisplayName
      : glossaryTermPermission.EditDisplayName;
  }, [glossaryPermission, glossaryTermPermission]);

  /**
   * To create breadcrumb from the fqn
   * @param fqn fqn of glossary or glossary term
   */
  const handleBreadcrumb = (fqn: string) => {
    const arr = fqn.split(FQN_SEPARATOR_CHAR);
    const dataFQN: Array<string> = [];
    const newData = arr.map((d, i) => {
      dataFQN.push(d);
      const isLink = i < arr.length - 1;

      return {
        name: d,
        url: isLink ? getGlossaryPath(dataFQN.join(FQN_SEPARATOR_CHAR)) : '',
        activeTitle: isLink,
      };
    });
    setBreadcrumb(newData);
  };

  const handleDelete = () => {
    const { id } = selectedData;
    if (isGlossaryActive) {
      onGlossaryDelete(id);
    } else {
      onGlossaryTermDelete(id);
    }
    setIsDelete(false);
  };

  const handleTreeClick = (
    _event: React.MouseEvent<HTMLElement, MouseEvent>,
    node: EventDataNode
  ) => {
    const key = node.key as string;
    if (selectedKey !== key) {
      handleChildLoading(true);
      handleSelectedData(key);
    }

    setIsNameEditing(false);
  };

  const onDisplayNameChange = (value: string) => {
    if (selectedData.displayName !== value) {
      setDisplayName(value);
    }
  };

  const onDisplayNameSave = () => {
    let updatedDetails = cloneDeep(selectedData);

    updatedDetails = {
      ...selectedData,
      displayName: displayName,
    };

    if (
      (updatedDetails as GlossaryTerm)?.glossary ||
      (updatedDetails as GlossaryTerm)?.parent
    ) {
      handleGlossaryTermUpdate(updatedDetails as GlossaryTerm);
    } else {
      updateGlossary(updatedDetails as Glossary);
    }

    setIsNameEditing(false);
  };

  useEffect(() => {
    if (glossaryList.length) {
      const generatedData = generateTreeData(glossaryList);
      setTreeData(generatedData);
    }
  }, [glossaryList]);

  useEffect(() => {
    handleBreadcrumb(selectedKey);
  }, [selectedKey]);

  useAfterMount(() => {
    setLeftPanelWidth(
      document.getElementById('glossary-left-panel')?.offsetWidth || 0
    );
    setAddTermButtonWidth(
      document.getElementById('add-term-button')?.offsetWidth || 0
    );
    setManageButtonWidth(
      document.getElementById('manage-button')?.offsetWidth || 0
    );
  });

  const manageButtonContent = () => {
    return (
      <Menu
        items={[
          {
            label: (
              <Space
                className="tw-cursor-pointer manage-button"
                size={8}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDelete(true);
                  setShowActions(false);
                }}>
                <SVGIcons alt="Delete" icon={Icons.DELETE} />
                <div className="tw-text-left" data-testid="delete-button">
                  <p
                    className="tw-font-medium"
                    data-testid="delete-button-title">
                    Delete
                  </p>
                  <p className="tw-text-grey-muted tw-text-xs">
                    Deleting this Glossary will permanently remove its metadata
                    from OpenMetadata.
                  </p>
                </div>
              </Space>
            ),
            key: 'delete-button',
          },
        ]}
      />
    );
  };

  const fetchLeftPanel = () => {
    return (
      <div className="tw-h-full tw-px-1" id="glossary-left-panel">
        <div className="tw-bg-white tw-h-full tw-py-2 left-panel-container">
          <div className="tw-flex tw-justify-between tw-items-center tw-px-3">
            <h6 className="tw-heading tw-text-base">Glossary</h6>
          </div>
          <div>
            {treeData.length ? (
              <Fragment>
                <div className="tw-px-3 tw-mb-3">
                  <Searchbar
                    showLoadingStatus
                    placeholder="Search term..."
                    searchValue={searchText}
                    typingInterval={500}
                    onSearch={handleSearchText}
                  />
                  <Tooltip
                    title={
                      createGlossaryPermission
                        ? 'Add Glossary'
                        : NO_PERMISSION_FOR_ACTION
                    }>
                    <button
                      className="tw--mt-1 tw-w-full tw-flex-center tw-gap-2 tw-py-1 tw-text-primary tw-border tw-rounded-md"
                      disabled={!createGlossaryPermission}
                      onClick={handleAddGlossaryClick}>
                      <SVGIcons alt="plus" icon={Icons.ICON_PLUS_PRIMERY} />{' '}
                      <span>Add Glossary</span>
                    </button>
                  </Tooltip>
                </div>
                {isSearchResultEmpty ? (
                  <p className="tw-text-grey-muted tw-text-center">
                    {searchText ? (
                      <span>{`No Glossary found for "${searchText}"`}</span>
                    ) : (
                      <span>No Glossary found</span>
                    )}
                  </p>
                ) : (
                  <TreeView
                    expandedKeys={expandedKey}
                    handleClick={handleTreeClick}
                    handleExpand={(key) => handleExpandedKey(key as string[])}
                    loadingKey={loadingKey}
                    ref={treeRef}
                    selectedKeys={[selectedKey]}
                    treeData={treeData}
                  />
                )}
              </Fragment>
            ) : (
              <Loader />
            )}
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    setDisplayName(selectedData?.displayName);
    if (selectedData) {
      fetchGlossaryPermission();
      fetchGlossaryTermPermission();
    }
  }, [selectedData]);

  return glossaryList.length ? (
    <PageLayout classes="tw-h-full tw-px-6" leftPanel={fetchLeftPanel()}>
      <div
        className="tw-flex tw-justify-between tw-items-center"
        data-testid="header">
        <div className="tw-text-link tw-text-base" data-testid="category-name">
          <TitleBreadcrumb
            titleLinks={breadcrumb}
            widthDeductions={
              leftPanelWidth + addTermButtonWidth + manageButtonWidth + 20 // Additional deduction for margin on the right of leftPanel
            }
          />
        </div>
        <div className="tw-relative tw-mr-2 tw--mt-2" id="add-term-button">
          <Tooltip
            title={
              createGlossaryTermPermission
                ? 'Add Term'
                : NO_PERMISSION_FOR_ACTION
            }>
            <ButtonAntd
              className="tw-h-8 tw-rounded tw-mb-1 tw-mr-2"
              data-testid="add-new-tag-button"
              disabled={!createGlossaryTermPermission}
              type="primary"
              onClick={handleAddGlossaryTermClick}>
              Add term
            </ButtonAntd>
          </Tooltip>

          <Dropdown
            align={{ targetOffset: [-12, 0] }}
            disabled={
              isGlossaryActive
                ? !glossaryPermission.Delete
                : !glossaryTermPermission.Delete
            }
            overlay={manageButtonContent()}
            overlayStyle={{ width: '350px' }}
            placement="bottomRight"
            trigger={['click']}
            visible={showActions}
            onVisibleChange={setShowActions}>
            <Tooltip
              title={
                glossaryPermission.Delete
                  ? 'Manage Glossary'
                  : NO_PERMISSION_FOR_ACTION
              }>
              <Button
                className="tw-rounded tw-justify-center tw-w-8 tw-h-8 glossary-manage-button tw-mb-1 tw-flex"
                data-testid="manage-button"
                disabled={!glossaryPermission.Delete}
                size="small"
                theme="primary"
                variant="outlined"
                onClick={() => setShowActions(true)}>
                <span>
                  <FontAwesomeIcon icon="ellipsis-vertical" />
                </span>
              </Button>
            </Tooltip>
          </Dropdown>
        </div>
      </div>
      {isChildLoading ? (
        <Loader />
      ) : (
        <>
          <div className="edit-input">
            {isNameEditing ? (
              <Row align="middle" gutter={8}>
                <Col>
                  <Input
                    className="input-width"
                    data-testid="displayName"
                    name="displayName"
                    value={displayName}
                    onChange={(e) => onDisplayNameChange(e.target.value)}
                  />
                </Col>
                <Col>
                  <Button
                    className="icon-buttons"
                    data-testid="cancelAssociatedTag"
                    size="custom"
                    theme="primary"
                    variant="contained"
                    onMouseDown={() => setIsNameEditing(false)}>
                    <FontAwesomeIcon
                      className="tw-w-3.5 tw-h-3.5"
                      icon="times"
                    />
                  </Button>
                  <Button
                    className="icon-buttons"
                    data-testid="saveAssociatedTag"
                    size="custom"
                    theme="primary"
                    variant="contained"
                    onMouseDown={onDisplayNameSave}>
                    <FontAwesomeIcon
                      className="tw-w-3.5 tw-h-3.5"
                      icon="check"
                    />
                  </Button>
                </Col>
              </Row>
            ) : (
              <Space className="display-name">
                <Title level={4}>{getEntityName(selectedData)}</Title>
                <Tooltip
                  title={
                    editDisplayNamePermission
                      ? 'Edit Displayname'
                      : NO_PERMISSION_FOR_ACTION
                  }>
                  <ButtonAntd
                    disabled={!editDisplayNamePermission}
                    type="text"
                    onClick={() => setIsNameEditing(true)}>
                    <SVGIcons
                      alt="icon-tag"
                      className="tw-mx-1"
                      icon={Icons.EDIT}
                      width="16"
                    />
                  </ButtonAntd>
                </Tooltip>
              </Space>
            )}
          </div>
          {!isEmpty(selectedData) &&
            (isGlossaryActive ? (
              <GlossaryDetails
                glossary={selectedData as Glossary}
                handleUserRedirection={handleUserRedirection}
                permissions={glossaryPermission}
                updateGlossary={updateGlossary}
              />
            ) : (
              <GlossaryTermsV1
                assetData={assetData}
                currentPage={currentPage}
                glossaryTerm={selectedData as GlossaryTerm}
                handleGlossaryTermUpdate={handleGlossaryTermUpdate}
                handleUserRedirection={handleUserRedirection}
                permissions={glossaryTermPermission}
                onAssetPaginate={onAssetPaginate}
                onRelatedTermClick={onRelatedTermClick}
              />
            ))}
        </>
      )}
      {selectedData && isDelete && (
        <EntityDeleteModal
          bodyText={getEntityDeleteMessage(selectedData.name, '')}
          entityName={selectedData.name}
          entityType="Glossary"
          loadingState={deleteStatus}
          onCancel={() => setIsDelete(false)}
          onConfirm={handleDelete}
        />
      )}
    </PageLayout>
  ) : (
    <PageLayout>
      <ErrorPlaceHolder>
        <p className="tw-text-center">No glossaries found</p>
        <p className="tw-text-center">
          <Button
            className="tw-h-8 tw-rounded tw-my-3"
            data-testid="add-webhook-button"
            disabled={!createGlossaryPermission}
            size="small"
            theme="primary"
            variant="contained"
            onClick={handleAddGlossaryClick}>
            Add New Glossary
          </Button>
        </p>
      </ErrorPlaceHolder>
    </PageLayout>
  );
};

export default GlossaryV1;

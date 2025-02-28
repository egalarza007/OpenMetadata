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
import { LoadingState } from 'Models';
import React, { FunctionComponent, useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { useAuthContext } from '../../authentication/auth-provider/AuthProvider';
import {
  deleteWebhook,
  getWebhookByName,
  updateWebhook,
} from '../../axiosAPIs/webhookAPI';
import AddWebhook from '../../components/AddWebhook/AddWebhook';
import PageContainerV1 from '../../components/containers/PageContainerV1';
import Loader from '../../components/Loader/Loader';
import {
  GlobalSettingOptions,
  GlobalSettingsMenuCategory,
} from '../../constants/globalSettings.constants';
import { FormSubmitType } from '../../enums/form.enum';
import { CreateWebhook } from '../../generated/api/events/createWebhook';
import { Webhook } from '../../generated/entity/events/webhook';
import { useAuth } from '../../hooks/authHooks';
import jsonData from '../../jsons/en';
import { getSettingPath } from '../../utils/RouterUtils';
import { showErrorToast } from '../../utils/ToastUtils';

const EDIT_HEADER_WEBHOOKS_TITLE: { [key: string]: string } = {
  msteams: 'MS Teams',
  slack: 'Edit Slack',
  generic: 'Edit Webhook',
};

const EditWebhookPage: FunctionComponent = () => {
  const { webhookName } = useParams<{ [key: string]: string }>();
  const { isAdminUser } = useAuth();
  const { isAuthDisabled } = useAuthContext();
  const history = useHistory();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [webhookData, setWebhookData] = useState<Webhook>();
  const [status, setStatus] = useState<LoadingState>('initial');
  const [deleteStatus, setDeleteStatus] = useState<LoadingState>('initial');

  const fetchWebhook = () => {
    setIsLoading(true);
    getWebhookByName(webhookName)
      .then((res) => {
        if (res) {
          setWebhookData(res);
        } else {
          throw jsonData['api-error-messages']['unexpected-error'];
        }
      })
      .catch((err: AxiosError) => {
        showErrorToast(err, jsonData['api-error-messages']['unexpected-error']);
      })
      .finally(() => setIsLoading(false));
  };

  const goToWebhooks = () => {
    history.push(
      getSettingPath(
        GlobalSettingsMenuCategory.INTEGRATIONS,
        GlobalSettingOptions.WEBHOOK
      )
    );
  };

  const handleCancel = () => {
    goToWebhooks();
  };

  const handleSave = (data: CreateWebhook) => {
    setStatus('waiting');
    const { name, secretKey } = webhookData || data;
    updateWebhook({ ...data, name, secretKey })
      .then((res) => {
        if (res) {
          setStatus('success');
          setTimeout(() => {
            setStatus('initial');
            goToWebhooks();
          }, 500);
        } else {
          throw jsonData['api-error-messages']['unexpected-error'];
        }
      })
      .catch((err: AxiosError) => {
        showErrorToast(err, jsonData['api-error-messages']['unexpected-error']);
        setStatus('initial');
      });
  };

  const handleDelete = (id: string) => {
    setDeleteStatus('waiting');
    deleteWebhook(id)
      .then((res) => {
        if (res) {
          setDeleteStatus('initial');
          goToWebhooks();
        } else {
          throw jsonData['api-error-messages']['unexpected-error'];
        }
      })
      .catch((err: AxiosError) => {
        showErrorToast(err, jsonData['api-error-messages']['unexpected-error']);
        setDeleteStatus('initial');
      });
  };

  useEffect(() => {
    fetchWebhook();
  }, []);

  return (
    <PageContainerV1>
      <div className="tw-self-center">
        {!isLoading ? (
          <AddWebhook
            allowAccess={isAdminUser || isAuthDisabled}
            data={webhookData}
            deleteState={deleteStatus}
            header={
              EDIT_HEADER_WEBHOOKS_TITLE[webhookData?.webhookType || 'generic']
            }
            mode={FormSubmitType.EDIT}
            saveState={status}
            webhookType={webhookData?.webhookType}
            onCancel={handleCancel}
            onDelete={handleDelete}
            onSave={handleSave}
          />
        ) : (
          <Loader />
        )}
      </div>
    </PageContainerV1>
  );
};

export default EditWebhookPage;

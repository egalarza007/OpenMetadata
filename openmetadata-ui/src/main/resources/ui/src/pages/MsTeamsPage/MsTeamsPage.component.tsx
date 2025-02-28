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

import { AxiosError } from 'axios';
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { getWebhooks } from '../../axiosAPIs/webhookAPI';
import PageContainerV1 from '../../components/containers/PageContainerV1';
import Loader from '../../components/Loader/Loader';
import WebhooksV1 from '../../components/Webhooks/WebhooksV1';
import {
  getAddWebhookPath,
  getEditWebhookPath,
  pagingObject,
} from '../../constants/constants';
import {
  Status,
  Webhook,
  WebhookType,
} from '../../generated/entity/events/webhook';
import { Paging } from '../../generated/type/paging';
import jsonData from '../../jsons/en';
import { showErrorToast } from '../../utils/ToastUtils';

const MsTeamsPage = () => {
  const history = useHistory();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [paging, setPaging] = useState<Paging>(pagingObject);
  const [data, setData] = useState<Array<Webhook>>([]);
  const [selectedStatus, setSelectedStatus] = useState<Status[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = (paging?: string) => {
    setIsLoading(true);
    getWebhooks(paging)
      .then((res) => {
        if (res.data) {
          const genericWebhooks = res.data.filter(
            (d) => d.webhookType === WebhookType.Msteams
          );
          setData(genericWebhooks);
          setPaging(res.paging);
        } else {
          setData([]);
          setPaging(pagingObject);

          throw jsonData['api-error-messages']['unexpected-server-response'];
        }
      })
      .catch((err: AxiosError) => {
        showErrorToast(
          err,
          jsonData['api-error-messages']['fetch-webhook-error']
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handlePageChange = (
    cursorType: string | number,
    activePage?: number
  ) => {
    const pagingString = `&${cursorType}=${
      paging[cursorType as keyof typeof paging]
    }`;
    fetchData(pagingString);
    setCurrentPage(activePage ?? 1);
  };

  const handleStatusFilter = (status: Status[]) => {
    setSelectedStatus(status);
  };

  const handleAddWebhook = () => {
    history.push(getAddWebhookPath(WebhookType.Msteams));
  };

  const handleClickWebhook = (name: string) => {
    history.push(getEditWebhookPath(name));
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <PageContainerV1>
      {!isLoading ? (
        <WebhooksV1
          currentPage={currentPage}
          data={data}
          paging={paging}
          selectedStatus={selectedStatus}
          webhookType={WebhookType.Msteams}
          onAddWebhook={handleAddWebhook}
          onClickWebhook={handleClickWebhook}
          onPageChange={handlePageChange}
          onStatusFilter={handleStatusFilter}
        />
      ) : (
        <Loader />
      )}
    </PageContainerV1>
  );
};

export default MsTeamsPage;

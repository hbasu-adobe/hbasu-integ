/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

interface ActionWebInvokeOptions {
  method: string;
  isFormData?: boolean;
}

interface VeevaAuthResponse {
  responseStatus: string;
  sessionId: string;
  userId: number;
  vaultIds: Array<{
    id: number;
    name: string;
    url: string;
  }>;
  vaultId: number;
}

interface VeevaQueryResponse {
  responseStatus: string;
  data: Array<{
    id: string;
    name__v: string;
    claim_category_id__c: string;
    claim_category_label__c: string;
    claim_statement__c: string;
  }>;
}

/**
 * Invokes a web action
 *
 * @param  {string} actionUrl
 * @param {string} authToken
 * @param {string} orgId
 * @param {object} params
 * @param {object} options
 *
 * @returns {Promise<any>} the response
 */
export async function actionWebInvoke(
  actionUrl: string,
  authToken: string,
  orgId: string,
  params: Record<string, any>,
  options: ActionWebInvokeOptions
): Promise<any> {
  const actionHeaders: Record<string, string> = {
    authorization: `Bearer ${authToken}`,
    'x-gw-ims-org-id': orgId
  };

  const fetchConfig: RequestInit = {
    headers: actionHeaders,
    method: options.method
  };

  if (window.location.hostname === 'localhost') {
    actionHeaders['x-ow-extra-logging'] = 'on'
  }

  let queryUrl = actionUrl;
  if (options.method === 'GET') {
    // For GET requests, append params to URL
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      queryParams.append(key, value);
    });
    queryUrl = `${actionUrl}?${queryParams.toString()}`;
  } else {
    // For non-GET requests, add body
    if (options.isFormData) {
      console.log('Form data')
      const formData = new FormData();
      Object.entries(params).forEach(([key, value]) => {
        formData.append(key, value);
      });
      fetchConfig.body = formData;
    } else {
      actionHeaders['Content-Type'] = 'application/json';
      fetchConfig.body = JSON.stringify(params);
    }
  }

  console.log('Request details:');
  console.log('URL:', queryUrl);
  console.log('Headers:', actionHeaders);
  console.log('Body:', fetchConfig.body);
  console.log('Method:', fetchConfig.method);
  
  const formDataStr = options.isFormData 
    ? Object.entries(params).map(([k, v]) => `-F "${k}=${v}"`).join(' ')
    : `-H "Content-Type: application/json" -d '${JSON.stringify(params)}'`;
  console.log(`curl -X ${fetchConfig.method} "${queryUrl}" -H "Authorization: Bearer ${authToken}" -H "x-gw-ims-org-id: ${orgId}" ${options.method === 'GET' ? '' : formDataStr}`);
  
  const response = await fetch(queryUrl, fetchConfig);
  const content = await response.text();

  if (!response.ok) {
    throw new Error(`failed request to '${queryUrl}' with status: ${response.status} and message: ${content}`);
  }

  try {
    return JSON.parse(content);
  } catch (e) {
    // response is not json
    return content;
  }
}
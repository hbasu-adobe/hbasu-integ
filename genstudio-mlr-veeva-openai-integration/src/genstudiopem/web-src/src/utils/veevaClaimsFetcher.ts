import { actionWebInvoke } from './actionWebInvoke';

const VEEVA_ACTION_URL = 'https://3399078-951plumfinch.adobeio-static.net/api/v1/web/genstudio-mlr-claims-app/veeva';

export interface Claim {
  id: string;           // logical claim id, e.g., "claim1"
  description: string;
  veevaId: string;      // Veeva record id, e.g., "V1A000000000101"
  reference?: string;   // Claim reference URL
}

export interface ClaimsLibrary {
  id: string;           // category id, e.g., "efficacy-claims"
  name: string;         // category label, e.g., "Efficacy Claims"
  claims: Claim[];
}

interface AuthParams {
  username: string;
  password: string;
  vaultUrl: string;
  apiVersion: string;
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

async function getVeevaSessionId(authToken: string, orgId: string): Promise<string> {
  try {
    const data = await actionWebInvoke(
      VEEVA_ACTION_URL,
      authToken,
      orgId,
      {
        operation: 'auth'
      },
      { method: 'POST', isFormData: false }
    );

    if (data.responseStatus === "SUCCESS" && data.sessionId) {
      return data.sessionId;
    }
    throw new Error("No sessionId in response");
  } catch (e) {
    throw new Error("Failed to authenticate with Veeva: " + (e as Error).message);
  }
}

export async function fetchClaimsFromVeevaVault(authToken: string, orgId: string): Promise<ClaimsLibrary[]> {
  try {
    console.log('Starting Veeva fetch process...');
    
    // Get session ID - credentials are now handled by backend
    const veevaSessionId = await getVeevaSessionId(authToken, orgId);
    console.log('Got Veeva session ID:', veevaSessionId);

    console.log('Querying Veeva for claims...');
    const data = await actionWebInvoke(
      VEEVA_ACTION_URL,
      authToken,
      orgId,
      {
        operation: 'query',
        sessionId: veevaSessionId,
        query: `SELECT id, name__v, claim_category_id__c, claim_category_label__c, claim_statement__c, claim_reference__c FROM VEEVA_OBJECT_NAME_PLACEHOLDER`
      },
      { method: 'GET' }
    );

    console.log('Received claims data from Veeva:', JSON.stringify(data, null, 2));

    if ((data.responseStatus === "SUCCESS" || data.responseStatus === "WARNING") && data.data) {
      console.log('Processing claims data...');
      const grouped: { [catId: string]: ClaimsLibrary } = {};
      for (const claim of data.data) {
        const categoryId = claim.claim_category_id__c;
        const categoryLabel = claim.claim_category_label__c;
        console.log('Processing claim:', {
          categoryId,
          categoryLabel,
          claimStatement: claim.claim_statement__c
        });
        if (!grouped[categoryId]) {
          grouped[categoryId] = {
            id: categoryId,
            name: categoryLabel,
            claims: [],
          };
        }
        grouped[categoryId].claims.push({
          id: claim.name__v,
          description: claim.claim_statement__c,
          veevaId: claim.id,
          reference: claim.claim_reference__c,
        });
      }
      return Object.values(grouped);
    }
    throw new Error("No data in response");
  } catch (e) {
    console.error('Error in fetchClaimsFromVeevaVault:', e);
    throw new Error("Failed to fetch claims from Veeva: " + (e as Error).message);
  }
}

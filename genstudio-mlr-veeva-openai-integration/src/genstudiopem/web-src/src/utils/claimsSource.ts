import { TEST_CLAIMS } from "../Constants";
import { fetchClaimsFromVeevaVault } from "./veevaClaimsFetcher";

export async function getClaims(authToken: string, orgId: string) {
  try {
    // Credentials are now handled by the backend action via environment variables
    return await fetchClaimsFromVeevaVault(authToken, orgId);
  } catch (error) {
    console.error("Error fetching claims from Veeva:", error);
    // Fallback to test claims if Veeva fails
    return TEST_CLAIMS;
  }
}
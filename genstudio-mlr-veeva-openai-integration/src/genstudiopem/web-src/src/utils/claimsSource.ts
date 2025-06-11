import { TEST_CLAIMS } from "../Constants";
import { fetchClaimsFromVeevaVault } from "./veevaClaimsFetcher";

// Set this flag to true to use Veeva, false to use local TEST_CLAIMS
const USE_VEEVA = true;

export async function getClaims(authToken: string, orgId: string) {
  if (USE_VEEVA) {
    try {
      return await fetchClaimsFromVeevaVault(authToken, orgId, {
        username: "XXXX",
        password: "XXXXX",
        vaultUrl: "XXXXXX",
        apiVersion: "XXXXX",
        objectName: "XXXXX"
      });
    } catch (error) {
      console.error("Error fetching claims from Veeva:", error);
      return TEST_CLAIMS;
    }
  } else {
    // Local as source
    return TEST_CLAIMS;
  }
}
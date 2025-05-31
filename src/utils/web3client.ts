import { create } from "@web3-storage/w3up-client";
import * as Delegation from "@web3-storage/w3up-client/delegation";
import { StoreIndexedDB } from "@web3-storage/w3up-client/stores/indexeddb";
import { storeDelegation, getDelegation, clearDelegation } from "./store";

let clientInstance: Awaited<ReturnType<typeof create>> | null = null;

/**
 * Initializes the Web3.Storage W3UP client for the frontend.
 *
 * This implementation uses IndexedDB for two levels of persistence:
 * - The frontend agent identity (via W3UP's StoreIndexedDB)
 * - The delegation CAR file and its expiration timestamp (via custom IndexedDB logic)
 *
 * On each call, this method ensures the user agent and its delegation are both valid:
 *
 * - If a valid agent and non-expired delegation exist in IndexedDB, reuse both.
 * - If the delegation is expired, request a new one from the backend for the existing agent.
 * - If no agent exists, a new one is created and stored in IndexedDB along with a new delegation.
 *
 * Steps:
 * 1. Rehydrate agent client from IndexedDB or create a new one if not present.
 * 2. Attempt to load delegation from IndexedDB and check if it's still valid.
 * 3. If delegation is valid, add it to the client.
 * 4. If delegation is missing or expired, request a new one from backend and store it.
 * 5. Register the space from the delegation and set it as current.
 * 6. Cache the initialized client instance for reuse.
 */
export async function initWeb3Client() {
  // Reuse previously initialized client if it exists
  if (clientInstance) return clientInstance;

  // Create or rehydrate the client using a persistent IndexedDB store
  const client = await create({ store: new StoreIndexedDB("w3up-store") });
  const agentDid = client.agent.did();
  console.log("Agent DID:", client.agent.did());

  // Load the shared space DID from environment
  const spaceDid = process.env.NEXT_PUBLIC_WEB3_SPACE as `did:${string}:${string}`;
  if (!spaceDid) throw new Error("Space address not found");

  let delegationOk: Awaited<ReturnType<typeof Delegation.extract>>["ok"];

  // Step 1: Try to reuse a previously stored delegation if it's still valid
  const stored = await getDelegation();
  const now = Math.floor(Date.now() / 1000); // current UNIX timestamp in seconds

  if (stored && now < stored.exp) {
    const delegation = await Delegation.extract(stored.bytes);
    // Ensure the delegation was issued to the current agent
    if (delegation.ok && delegation.ok.audience.did() === agentDid) {
      delegationOk = delegation.ok;
    } else {
      await clearDelegation(); // Remove invalid or mismatched delegation
    }
  }

  // Step 2: Fetch a new delegation from the backend if none is valid
  if (!delegationOk) {
    const res = await fetch(`/api/delegation/${encodeURIComponent(agentDid)}`);
    if (!res.ok) throw new Error("Failed to fetch delegation from backend");

    const bytes = new Uint8Array(await res.arrayBuffer());
    const delegation = await Delegation.extract(bytes);
    if (!delegation.ok) throw new Error("Failed to extract delegation");

    // Ensure delegation is indeed issued to the current agent
    if (delegation.ok.audience.did() !== agentDid) {
      throw new Error("Delegation audience mismatch");
    }

    // Store delegation along with known expiration (24 hours from now)
    const exp = now + 60 * 60 * 24;
    await storeDelegation(bytes, exp);

    delegationOk = delegation.ok;
  }

  // Step 3: Register the delegation and activate the granted space
  await client.addProof(delegationOk);
  const space = await client.addSpace(delegationOk);
  await client.setCurrentSpace(space.did());

  // Cache the client for reuse
  clientInstance = client;
  return client;
}

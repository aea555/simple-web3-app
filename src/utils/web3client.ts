import { create } from '@web3-storage/w3up-client';

let clientInstance: Awaited<ReturnType<typeof create>> | null = null;

/**
 * Initializes the Web3.Storage W3UP client using a pre-authorized UCAN identity.
 * Uses the `NEXT_PUBLIC_WEB3_SPACE` value from `.env.local`
 */
export async function initWeb3Client() {
  if (clientInstance) return clientInstance;

  const spaceDid = process.env.NEXT_PUBLIC_WEB3_SPACE as `did:${string}:${string}`;
  if (!spaceDid) throw new Error("❌ NEXT_PUBLIC_WEB3_SPACE not found in .env.local");

  const client = await create();
  const account = await client.login(process.env.NEXT_PUBLIC_EMAIL as `${string}@${string}`)
  await client.capability.access.claim();

  await client.setCurrentSpace(spaceDid);

  clientInstance = client;
  return client;
}
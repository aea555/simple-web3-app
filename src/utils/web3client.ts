import { create } from "@web3-storage/w3up-client";
import { StoreIndexedDB } from "@web3-storage/w3up-client/stores/indexeddb";

export async function getPersistentW3Client() {
  return await create({ store: new StoreIndexedDB("w3up-store") });
}
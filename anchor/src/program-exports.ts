// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import ProgramIDL from '../target/idl/rsa_storage.json'
import type { RsaStorage } from '../target/types/rsa_storage'

// Re-export the generated IDL and type
export { RsaStorage, ProgramIDL }

// The programId is imported from the program IDL.
export const PROGRAM_ID = new PublicKey(ProgramIDL.address)

// This is a helper function to get the Anchor program.
export function getProgram(provider: AnchorProvider, address?: PublicKey) {
  return new Program({ ...ProgramIDL, address: address ? address.toBase58() : ProgramIDL.address } as RsaStorage, provider)
}

// This is a helper function to get the program ID for the Counter program depending on the cluster.
export function getProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
    case 'testnet':
    case 'mainnet-beta':
    default:
      return PROGRAM_ID
  }
}

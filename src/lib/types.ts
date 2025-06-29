import { BN, Program } from "@coral-xyz/anchor";
import { RsaStorage } from "@project/anchor";
import { PublicKey } from "@solana/web3.js";

export type FileMetadata = {
  cid: string;
  keyCid: string;
  timestamp: number;
  isPublic: boolean;
  extension: string | null;
};

export type SolanaProgramContext = {
  program: Program<RsaStorage>;
  programId: PublicKey;
};

export type UserFile = {
  cid: string;
  keyCid: string;
  uploader: PublicKey;
  timestamp: BN;
  isPublic: boolean;
  extension: string;
  pubkey: PublicKey;
};

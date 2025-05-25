import { Program } from "@coral-xyz/anchor";
import { RsaStorage } from "@project/anchor";
import { PublicKey } from "@solana/web3.js";

export type FileMetadata = {
  cid: string;
  keyCid: string;
  timestamp: number;
  isPublic: boolean;
};

export type SolanaProgramContext = {
  program: Program<RsaStorage>;
  programId: PublicKey;
};

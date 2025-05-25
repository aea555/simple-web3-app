import { AnchorProvider } from "@coral-xyz/anchor";
import { Connection } from "@solana/web3.js";
import { getProgram, getProgramId } from "@project/anchor";
import { AnchorWallet } from "@solana/wallet-adapter-react";

export function initSolanaProgram(anchorWallet: AnchorWallet) {
  const connection = new Connection("https://api.devnet.solana.com");
  const provider = new AnchorProvider(connection, anchorWallet, {});
  const program = getProgram(provider);
  const programId = getProgramId("devnet");
  return { program, programId };
}

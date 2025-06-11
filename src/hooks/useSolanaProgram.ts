import { useMemo } from "react";
import { AnchorWallet } from "@solana/wallet-adapter-react";
import { initSolanaProgram } from "@/lib/solana";
import { SolanaProgramContext } from "@/lib/types";

export function useSolanaProgram(wallet: AnchorWallet | undefined): SolanaProgramContext | undefined {
  return useMemo(() => {
    if (!wallet) return undefined;

    const {program, programId} = initSolanaProgram(wallet); 

    return { program, programId };
  }, [wallet]);
}

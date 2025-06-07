import { Dispatch, SetStateAction, useEffect } from "react";

type uploadUseEffectProps = {
  hasEncryptedPrivateKey(): Promise<boolean>;
  setHasPrivateKey: Dispatch<SetStateAction<boolean>>;
};

export default function uploadUseEffect({ hasEncryptedPrivateKey, setHasPrivateKey }: uploadUseEffectProps) {
  // Check for private key existence on component mount
  useEffect(() => {
    hasEncryptedPrivateKey().then(setHasPrivateKey);
  }, []);
};

import { useUnit } from 'effector-react';

import useGenerator from './common/useGenerator';
import { DEFAULT_FRAME_DELAY } from './common/constants';
import { createSubstrateSignPayload } from './common/utils';
import type { ChainId } from '@shared/core';
import { walletModel } from '@entities/wallet';

type Props = {
  size?: number;
  bgColor?: string;
  skipEncoding?: boolean;
  delay?: number;
  address: string;
  payload: Uint8Array | string;
  genesisHash: Uint8Array | ChainId;
  derivationPath?: string;
};

export const QrTxGenerator = ({
  address,
  genesisHash,
  payload,
  size,
  skipEncoding = false,
  bgColor = 'none',
  delay = DEFAULT_FRAME_DELAY,
  derivationPath,
}: Props) => {
  const activeWallet = useUnit(walletModel.$activeWallet);
  const signPayload = createSubstrateSignPayload(address, payload, genesisHash, activeWallet?.type, derivationPath);

  const image = useGenerator(signPayload, skipEncoding, delay, bgColor);

  if (!signPayload || !image) {
    return null;
  }

  return <div style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: image }} />;
};

export default QrTxGenerator;

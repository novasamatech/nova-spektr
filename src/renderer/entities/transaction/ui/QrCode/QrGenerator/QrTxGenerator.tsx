import { u8aConcat } from '@polkadot/util';

import { type ChainId, type CryptoType, type SigningType } from '@/shared/core';

import { DEFAULT_FRAME_DELAY, SUBSTRATE_ID } from './common/constants';
import useGenerator from './common/useGenerator';
import { createSubstrateSignPayload } from './common/utils';

type Props = {
  address: string;
  signingType: SigningType;
  cryptoType: CryptoType;
  genesisHash: Uint8Array | ChainId;
  payload: Uint8Array | string;
  derivationPath?: string;
  size?: number;
  skipEncoding?: boolean;
  bgColor?: string;
  delay?: number;
};

export const QrTxGenerator = ({
  address,
  signingType,
  genesisHash,
  payload,
  derivationPath,
  size,
  skipEncoding = false,
  bgColor = 'none',
  delay = DEFAULT_FRAME_DELAY,
  cryptoType,
}: Props) => {
  const signPayload = u8aConcat(
    SUBSTRATE_ID,
    createSubstrateSignPayload(address, payload, genesisHash, signingType, derivationPath, cryptoType),
  );

  const image = useGenerator(signPayload, skipEncoding, delay, bgColor);

  if (!signPayload || !image) {
    return null;
  }

  return <div style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: image }} />;
};

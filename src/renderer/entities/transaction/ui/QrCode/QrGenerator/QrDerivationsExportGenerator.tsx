import { useUnit } from 'effector-react';
import init, { Encoder } from 'raptorq/raptorq';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { type VaultChainAccount, type VaultShardAccount } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { networkModel } from '@/entities/network';

import { DEFAULT_FRAME_DELAY } from './common/constants';
import useGenerator from './common/useGenerator';
import { createDynamicDerivationExportPayload } from './common/utils';

type Props = {
  walletName: string;
  rootAccountId: AccountId;
  derivations: (VaultChainAccount | VaultShardAccount)[];
  size?: number;
  bgColor?: string;
  skipEncoding?: boolean;
  delay?: number;
};

export const QrDerivationsExportGenerator = ({
  walletName,
  rootAccountId,
  derivations,
  size,
  skipEncoding = false,
  bgColor = 'none',
  delay = DEFAULT_FRAME_DELAY,
}: Props) => {
  const chains = useUnit(networkModel.$chains);
  const [encoder, setEncoder] = useState<Encoder>();

  const payload = useMemo(
    () =>
      createDynamicDerivationExportPayload(walletName, toAddress(rootAccountId, { prefix: 1 }), derivations, chains),
    [walletName, rootAccountId, derivations, chains],
  );

  const createEncoder = useCallback(async () => {
    try {
      await init();
      setEncoder(Encoder.with_defaults(payload, 128));
    } catch (error) {
      console.error('Failed to create encoder:', error);
    }
  }, [payload]);

  useEffect(() => {
    createEncoder();
  }, [createEncoder]);

  const image = useGenerator(payload, skipEncoding, delay, bgColor, encoder);

  if (!image) {
    return null;
  }

  return <div style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: image }} />;
};

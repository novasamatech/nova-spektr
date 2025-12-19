import { type ApiPromise } from '@polkadot/api';
import { u8aConcat } from '@polkadot/util';
import { useEffect, useRef, useState } from 'react';

import { TEST_IDS } from '@/shared/constants/testIds';
import { type Chain, SigningType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { assert, createTxMetadata } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Button } from '@/shared/ui';
import { Box, Tabs } from '@/shared/ui-kit';
import { type AnyAccount, type Extrinsic } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';
import { transactionService } from '../../lib';
import { QrTxGenerator } from '../QrCode/QrGenerator/QrTxGenerator';
import { SUBSTRATE_ID } from '../QrCode/QrGenerator/common/constants';
import {
  createDynamicDerivationsSignPayload,
  createDynamicDerivationsSignWithProofPayload,
  createSignPayload,
  createSignWithProofPayload,
} from '../QrCode/QrGenerator/common/utils';
import { QrGeneratorContainer } from '../QrCode/QrGeneratorContainer/QrGeneratorContainer';

import { getPolkadotVaultVersion } from './common/utils';

type Props = {
  api: ApiPromise;
  chain: Chain;
  extrinsic: Extrinsic;
  account: AnyAccount;
  countdown: number;
  rootAccountId: AccountId;
  onGoBack: () => void;
  onResetCountdown: () => void;
  onResult: (txPayload: Uint8Array) => void;
};

export const ScanSingleframeQr = ({
  api,
  chain,
  extrinsic,
  account,
  countdown,
  rootAccountId,
  onGoBack,
  onResetCountdown,
  onResult,
}: Props) => {
  const { t } = useI18n();
  const [tab, setTab] = useState('new');
  const prevTab = useRef<string>(null);

  const [txPayload, setTxPayload] = useState<Uint8Array>();
  const [qrPayload, setQrPayload] = useState<Uint8Array>();

  const isMetadataProofsSupported = chain.additional?.supportsGenericLedgerApp ?? false;
  const isEthereumAccount = accountUtils.isEthereumBased(account);

  useEffect(() => {
    if (txPayload && qrPayload && tab === prevTab.current) return;
    prevTab.current = tab;
    setupTransaction().catch(() => console.warn('ScanSingleframeQr | setupTransaction() failed'));
  }, [txPayload, qrPayload, tab]);

  const setupTransaction = async (): Promise<void> => {
    try {
      const derivationPath =
        accountUtils.isVaultChainAccount(account) || accountUtils.isVaultShardAccount(account)
          ? account.derivationPath
          : null;

      if (tab === 'new' && isMetadataProofsSupported) {
        const { payload, metadataProof } = await transactionService.createPayloadWithProof(
          extrinsic,
          account.accountId,
          api,
        );

        let signPayload: Uint8Array;
        if (account.signingType === SigningType.POLKADOT_VAULT) {
          assert(derivationPath, 'Derivation path not found');
          signPayload = createDynamicDerivationsSignWithProofPayload(
            rootAccountId,
            metadataProof,
            payload,
            chain.chainId,
            derivationPath,
            account.cryptoType,
          );
        } else {
          signPayload = createSignWithProofPayload(
            account.accountId,
            metadataProof,
            payload,
            chain.chainId,
            account.cryptoType,
          );
        }

        const qrPayload = u8aConcat(SUBSTRATE_ID, signPayload);

        setTxPayload(payload);
        setQrPayload(qrPayload);
      } else {
        const metadata = await createTxMetadata(account.accountId, api);
        const { payload } = transactionService.createPayloadWithMetadata(extrinsic, api, metadata);

        let signPayload: Uint8Array;
        if (account.signingType === SigningType.POLKADOT_VAULT && !isEthereumAccount) {
          assert(derivationPath, 'Derivation path not found');
          signPayload = createDynamicDerivationsSignPayload(
            rootAccountId,
            payload,
            chain.chainId,
            derivationPath,
            account.cryptoType,
          );
        } else {
          signPayload = createSignPayload(account.accountId, payload, chain.chainId, account.cryptoType);
        }

        const qrPayload = u8aConcat(SUBSTRATE_ID, signPayload);

        setTxPayload(payload);
        setQrPayload(qrPayload);
      }
    } catch (error) {
      console.warn(error);
    }
  };

  useEffect(onResetCountdown, [qrPayload]);

  return (
    <>
      <QrGeneratorContainer
        countdown={countdown}
        chainId={chain.chainId}
        isLegacyQR={tab === 'legacy'}
        testId={TEST_IDS.OPERATIONS.QR_CODE_CONTAINER}
        onQrReset={setupTransaction}
      >
        {isMetadataProofsSupported && (
          <Tabs value={tab} onChange={setTab}>
            <Box shrink={0} fitContainer>
              <Tabs.List>
                <Tabs.Trigger value="new">
                  {t('signing.qrNewVaultTitle', { version: getPolkadotVaultVersion(account.signingType) })}
                </Tabs.Trigger>
                <Tabs.Trigger value="legacy">{t('signing.qrLegacyVaultTitle')}</Tabs.Trigger>
              </Tabs.List>
            </Box>
          </Tabs>
        )}
        <QrTxGenerator payload={qrPayload} />
      </QrGeneratorContainer>

      <div className="mt-3 flex w-full justify-between pl-2">
        <Button variant="text" onClick={onGoBack}>
          {t('operation.goBackButton')}
        </Button>

        <Button disabled={!txPayload || countdown === 0} onClick={() => onResult(txPayload!)}>
          {t('signing.continueButton')}
        </Button>
      </div>
    </>
  );
};

import { useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { getNativeAsset, nullable } from '@/shared/lib/utils';
import { Button, ButtonWebLink, DetailRow, Icon, LargeTitleText, Separator } from '@/shared/ui';
import { TransactionDetails } from '@/shared/ui-entities';
import { Box, JsonArgs, Modal } from '@/shared/ui-kit';
import { transactionService } from '@/domains/network';
import { SignButton } from '@/entities/operations';
import { FeeWithLabel } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { confirmModel } from '../model/confirm';

type Props = {
  onGoBack?: () => void;
};

const getPolkadotAppDecodedUrl = (node: string, callData: string) => {
  return `https://polkadot.js.org/apps/?rpc=${encodeURIComponent(node)}#/extrinsics/decode/${encodeURIComponent(callData)}`;
};

export const Confirmation = memo(({ onGoBack }: Props) => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);
  const confirms = useUnit(confirmModel.$confirms);
  const confirm = confirms.at(0) ?? null;

  if (!confirm) return null;

  const { api, initiator, signatory, chain, signatoryWallet, transaction, fee, args } = confirm;
  const node = chain.nodes.at(0);
  if (nullable(node)) return null;

  const asset = getNativeAsset(chain.assets);

  let callData: string;
  try {
    const extrinsic = transactionService.createExtrinsic(transaction, api);
    callData = extrinsic.method.toHex();
  } catch {
    const encodedTransaction = transactionService.encodeTransaction(transaction, api);
    callData = encodedTransaction.callData;
  }

  const decodedLink = getPolkadotAppDecodedUrl(node.url, callData);

  return (
    <>
      <div className="mb-2 flex flex-col items-center gap-y-3 px-5 py-4">
        <Icon className="text-icon-default" name="unknownConfirm" size={60} />
        <LargeTitleText className="font-manrope">{t('callData.confirmation.title')}</LargeTitleText>
      </div>

      <Box padding={[4, 5]}>
        <TransactionDetails chain={chain} wallets={wallets} initiators={[initiator]} signatory={signatory}>
          <DetailRow label={t('callData.confirmation.fields.externalExplorer.label')}>
            <ButtonWebLink className="p-0" size="sm" variant="text" href={decodedLink} target="_blank">
              {t('callData.confirmation.fields.externalExplorer.value')}
            </ButtonWebLink>
          </DetailRow>
          <DetailRow label={t('callData.confirmation.fields.details.label')}>
            <Modal size="lg" height="fit">
              <Modal.Trigger>
                <Button className="p-0" size="sm" variant="text">
                  {t('callData.confirmation.fields.details.value')}
                </Button>
              </Modal.Trigger>
              <Modal.Title close>{t('callData.confirmation.fields.details.label')}</Modal.Title>
              <Modal.Content>
                <Box padding={5}>
                  <JsonArgs value={args} />
                </Box>
              </Modal.Content>
            </Modal>
          </DetailRow>
          <Separator className="w-full pr-2" />
          <FeeWithLabel asset={asset} fee={fee} />
        </TransactionDetails>
      </Box>

      <Modal.Footer align="between">
        {onGoBack && (
          <Button variant="text" onClick={onGoBack}>
            {t('operation.goBackButton')}
          </Button>
        )}

        <SignButton type={signatoryWallet.type} onClick={confirmModel.startSigning} />
      </Modal.Footer>
    </>
  );
});

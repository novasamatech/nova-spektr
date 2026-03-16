import { useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { getNativeAsset } from '@/shared/lib/utils';
import { Button, DetailRow, Icon, Separator } from '@/shared/ui';
import { AssetBalance, TransactionDetails } from '@/shared/ui-entities';
import { Box, Modal } from '@/shared/ui-kit';
import { MultiTransferPreview } from '@/entities/multi-transfer';
import { SignButton } from '@/entities/operations';
import { FeeWithLabel, MultisigDepositFee } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { AssetFiatBalance } from '@/widgets/price';
import { confirmModel } from '../model/confirm';

type Props = {
  onGoBack?: () => void;
};

export const Confirmation = memo(({ onGoBack }: Props) => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);
  const confirms = useUnit(confirmModel.$confirms);
  const confirm = confirms.at(0) ?? null;

  if (!confirm) return null;

  const { initiator, signatory, chain, fee, amount, hasMultisigAccount, multisigDeposit, transfers, issues } =
    confirm.meta;

  const asset = getNativeAsset(chain.assets);

  return (
    <>
      <div className="mb-2 flex flex-col items-center gap-y-3">
        <Icon className="text-icon-default" name="multiTransfer" size={60} />

        <div className="flex flex-col items-center gap-y-1">
          <AssetBalance
            value={amount}
            asset={asset}
            keepPrecision={true}
            className="text-center font-manrope text-[32px] leading-[36px] font-bold text-text-primary"
          />
          <AssetFiatBalance asset={asset} amount={amount} className="text-center text-headline" />
        </div>
      </div>

      <Box padding={[4, 5]}>
        <TransactionDetails chain={chain} wallets={wallets} initiators={[initiator]} signatory={signatory}>
          <DetailRow label={t('multiTransfer.confirmation.labels.parsedFile', 'Parsed file')}>
            <MultiTransferPreview chain={chain} asset={asset} transfers={transfers} issues={issues}>
              <Button className="p-0" size="sm" variant="text">
                {t('multiTransfer.parsedFile.buttons.openPreview', 'Preview')}
              </Button>
            </MultiTransferPreview>
          </DetailRow>

          <Separator className="border-filter-border" />

          <DetailRow label={t('multiTransfer.confirmation.labels.totalAmount', 'Total amount')}>
            <div className="flex flex-col items-end gap-y-0.5">
              <AssetBalance value={amount} asset={asset} showSymbol />
              <AssetFiatBalance asset={asset} amount={amount} />
            </div>
          </DetailRow>
          {hasMultisigAccount && <MultisigDepositFee asset={asset} multisigDeposit={multisigDeposit} />}
          <FeeWithLabel asset={asset} fee={fee} />
        </TransactionDetails>
      </Box>

      <Modal.Footer align="between">
        {onGoBack && (
          <Button variant="text" onClick={onGoBack}>
            {t('operation.goBackButton')}
          </Button>
        )}

        <SignButton type={confirm.wallets.signatory.type} onClick={confirmModel.startSigning} />
      </Modal.Footer>
    </>
  );
});

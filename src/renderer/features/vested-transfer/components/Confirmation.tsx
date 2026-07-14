import { useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { getNativeAsset, getTimelineChainId } from '@/shared/lib/utils';
import { Button, DetailRow, Icon, Separator } from '@/shared/ui';
import { AssetBalance, TransactionDetails } from '@/shared/ui-entities';
import { Box, Modal, ScrollArea } from '@/shared/ui-kit';
import { type VestingScheduleRaw } from '@/domains/vesting';
import { networkModel } from '@/entities/network';
import { SignButton } from '@/entities/operations';
import { walletModel } from '@/entities/wallet';
import { CallDataConfirmSection } from '@/features/operations/OperationsConfirm/common/CallDataConfirmSection';
import { MultisigOperationDescriptionField } from '@/features/operations/OperationsConfirm/common/MultisigOperationDescriptionField';
import { AssetFiatBalance } from '@/widgets/price';
import { FeeWithLabel, MultisigDepositFee } from '@/widgets/transaction-fee';
import { VestingSchedulePreview } from '@/widgets/vesting-schedule-preview';
import { confirmModel } from '../model/confirm';

type Props = {
  onGoBack?: () => void;
};

export const Confirmation = memo(({ onGoBack }: Props) => {
  const { t } = useI18n();

  const apis = useUnit(networkModel.$apis);
  const chains = useUnit(networkModel.$chains);
  const wallets = useUnit(walletModel.$wallets);
  const confirms = useUnit(confirmModel.$confirms);
  const confirm = confirms.at(0) ?? null;

  if (!confirm) return null;

  const { initiator, signatory, chain, fee, amount, hasMultisigAccount, multisigDeposit, vestingSchedule, issues } =
    confirm.meta;
  const vestingScheduleRaw: VestingScheduleRaw[] = vestingSchedule.map((vesting) => ({
    target: vesting.target,
    locked: vesting.locked.toString(),
    startingBlock: vesting.startingBlock.toString(),
    perBlock: vesting.perBlock.toString(),
    unlockedAtStartBlock: vesting.unlockedAtStartBlock?.toString(),
  }));

  const timelineChainId = getTimelineChainId(chain);
  const timelineChain = chains[timelineChainId] ?? null;
  const timelineApi = apis[timelineChainId] ?? null;
  const asset = getNativeAsset(chain.assets);
  const api = apis?.[chain.chainId] ?? null;

  return (
    <>
      <ScrollArea>
        <div className="mb-2 flex flex-col items-center gap-y-3">
          <Icon className="text-icon-default" name="vestedTransferConfirm" size={60} />

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
            <DetailRow label={t('vestedTransfer.confirmation.labels.parsedFile')}>
              <VestingSchedulePreview
                timelineApi={timelineApi}
                timelineChain={timelineChain}
                chain={chain}
                asset={asset}
                vestingSchedule={vestingScheduleRaw}
                issues={issues}
              >
                <Button className="p-0" size="sm" variant="text">
                  {t('vestedTransfer.parsedFile.buttons.openPreview')}
                </Button>
              </VestingSchedulePreview>
            </DetailRow>

            <Separator className="border-filter-border" />

            <DetailRow label={t('vestedTransfer.confirmation.labels.totalAmount')}>
              <div className="flex flex-col items-end gap-y-0.5">
                <AssetBalance value={amount} asset={asset} showSymbol />
                <AssetFiatBalance asset={asset} amount={amount} />
              </div>
            </DetailRow>
            {hasMultisigAccount && <MultisigDepositFee asset={asset} multisigDeposit={multisigDeposit} />}
            <FeeWithLabel asset={asset} fee={fee} />
            {api && (
              <CallDataConfirmSection api={api} chain={chain} resultTx={confirm.meta.tx} coreTx={confirm.meta.coreTx} />
            )}
          </TransactionDetails>
        </Box>

        <div className="px-5 pb-4">
          <MultisigOperationDescriptionField />
        </div>
      </ScrollArea>

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

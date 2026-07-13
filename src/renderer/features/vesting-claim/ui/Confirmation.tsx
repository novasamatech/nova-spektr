import { useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { getNativeAsset } from '@/shared/lib/utils';
import { Button, DetailRow, FootnoteText, Icon, Separator } from '@/shared/ui';
import { AssetBalance, TransactionDetails } from '@/shared/ui-entities';
import { Box, Modal, ScrollArea } from '@/shared/ui-kit';
import { networkModel } from '@/entities/network';
import { SignButton } from '@/entities/operations';
import { walletModel } from '@/entities/wallet';
import { AssetFiatBalance } from '@/widgets/price';
import { FeeWithLabel } from '@/widgets/transaction-fee';
import { confirmModel } from '../model/confirm';

type Props = {
  onGoBack?: () => void;
};

export const Confirmation = memo(({ onGoBack }: Props) => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);
  const apis = useUnit(networkModel.$apis);
  const confirms = useUnit(confirmModel.$confirms);

  const first = confirms.at(0) ?? null;
  if (!first) return null;

  const primaryAsset = getNativeAsset(first.meta.chain.assets);

  return (
    <>
      <ScrollArea>
        <div className="mb-2 flex flex-col items-center gap-y-3">
          <Icon className="text-icon-default" name="vestedTransferConfirm" size={60} />
          {primaryAsset && (
            <div className="flex flex-col items-center gap-y-1">
              <AssetBalance
                value={first.meta.claimable}
                asset={primaryAsset}
                keepPrecision
                className="text-center font-manrope text-[32px] leading-[36px] font-bold text-text-primary"
              />
              <AssetFiatBalance
                asset={primaryAsset}
                amount={first.meta.claimable}
                className="text-center text-headline"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-y-4">
          {confirms.map((confirm) => {
            const { chain, initiator, signatory, claimable, stillLocked, fee } = confirm.meta;
            const asset = getNativeAsset(chain.assets);
            const api = apis[chain.chainId] ?? null;

            return (
              <Box key={confirm.meta.id ?? confirm.meta.initiator.accountId} padding={[4, 5]}>
                <TransactionDetails chain={chain} wallets={wallets} initiators={[initiator]} signatory={signatory}>
                  <DetailRow label={t('vesting.confirm.labels.unlocksNow')}>
                    <div className="flex flex-col items-end gap-y-0.5">
                      <AssetBalance value={claimable} asset={asset} showSymbol />
                      <AssetFiatBalance asset={asset} amount={claimable} />
                    </div>
                  </DetailRow>
                  <DetailRow label={t('vesting.confirm.labels.keepsVesting')}>
                    <div className="flex flex-col items-end gap-y-0.5">
                      <AssetBalance value={stillLocked} asset={asset} showSymbol />
                      <AssetFiatBalance asset={asset} amount={stillLocked} />
                    </div>
                  </DetailRow>
                  <Separator className="border-filter-border" />
                  <FeeWithLabel asset={asset} fee={fee} />
                  {!api && null}
                </TransactionDetails>
              </Box>
            );
          })}
        </div>

        <FootnoteText className="px-5 pt-3 text-text-tertiary">{t('vesting.confirm.hint')}</FootnoteText>
      </ScrollArea>

      <Modal.Footer align="between">
        {onGoBack && (
          <Button variant="text" onClick={onGoBack}>
            {t('operation.goBackButton')}
          </Button>
        )}
        <SignButton type={first.wallets.signatory.type} onClick={confirmModel.startSigning} />
      </Modal.Footer>
    </>
  );
});

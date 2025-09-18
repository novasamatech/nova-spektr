import { useStoreMap, useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { getNativeAsset } from '@/shared/lib/utils';
import { Button, DetailRow, FootnoteText, Icon } from '@/shared/ui';
import { AssetBalance, TransactionDetails } from '@/shared/ui-entities';
import { Tooltip } from '@/shared/ui-kit';
import { SignButton } from '@/entities/operations';
import { AssetFiatBalance } from '@/entities/price';
import { StakingPopover } from '@/entities/staking';
import { FeeWithLabel } from '@/entities/transaction';
import { accountUtils, walletModel } from '@/entities/wallet';
import { MultisigExistsAlert } from '../../common/MultisigExistsAlert';
import { confirmModel } from '../model/confirm-model';

type Props = {
  id?: number;
  secondaryActionButton?: ReactNode;
  hideSignButton?: boolean;
  onGoBack?: () => void;
};

export const Confirmation = ({ id = 0, onGoBack, secondaryActionButton, hideSignButton }: Props) => {
  const { t } = useI18n();
  const wallets = useUnit(walletModel.$wallets);

  const confirms = useUnit(confirmModel.$confirms);
  const confirm = useStoreMap({
    store: confirmModel.$confirmMap,
    keys: [id],
    fn: (value, [id]) => value[id],
  });

  const initiatorWallet = confirm.wallets.initiator;
  const signerWallet = confirm.wallets.signatory;
  const isMultisigExists = useUnit(confirmModel.$isMultisigExists);
  const hasAnyMultisigAccount = confirm.meta.route.some(accountUtils.isAnyMultisigAccount);
  const nativeAsset = getNativeAsset(confirm.meta.chain.assets);

  if (!confirm || !initiatorWallet) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-y-4 px-5 pt-4 pb-4">
      <div className="mb-2 flex flex-col items-center gap-y-3">
        <Icon className="text-icon-default" name="returnToStakeConfirm" size={60} />

        <div className="flex flex-col items-center gap-y-1">
          <AssetBalance
            value={confirm.meta.amount}
            asset={confirm.meta.asset}
            className="font-manrope text-[32px] leading-[36px] font-bold text-text-primary"
          />
          <AssetFiatBalance asset={confirm.meta.asset} amount={confirm.meta.amount} className="text-headline" />
        </div>
      </div>

      <MultisigExistsAlert active={isMultisigExists} />

      <TransactionDetails
        chain={confirm.meta.chain}
        wallets={wallets}
        initiators={confirms.map((confirm) => confirm.meta.initiator)}
        signatory={confirm.meta.signatory}
      >
        {hasAnyMultisigAccount && (
          <DetailRow
            className="text-text-primary"
            label={
              <>
                <Icon className="text-text-tertiary" name="lock" size={12} />
                <FootnoteText className="text-text-tertiary">{t('staking.multisigDepositLabel')}</FootnoteText>
                <Tooltip>
                  <Tooltip.Trigger>
                    <div tabIndex={0}>
                      <Icon name="info" className="cursor-pointer hover:text-icon-hover" size={16} />
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Content>{t('staking.tooltips.depositDescription')}</Tooltip.Content>
                </Tooltip>
              </>
            }
          >
            <div className="flex flex-col items-end gap-y-0.5">
              <AssetBalance value={confirm.meta.multisigDeposit} asset={nativeAsset} />
              <AssetFiatBalance asset={nativeAsset} amount={confirm.meta.multisigDeposit} />
            </div>
          </DetailRow>
        )}

        <FeeWithLabel
          fee={confirm.meta.fee}
          asset={nativeAsset}
          label={t('staking.networkFee', { count: confirms.length || 1 })}
        />

        {confirms.length > 1 && (
          <FeeWithLabel fee={confirm.meta.totalFee} asset={nativeAsset} label={t('staking.networkFeeTotal')} />
        )}

        <StakingPopover labelText={t('staking.confirmation.hintTitle')}>
          <StakingPopover.Item>{t('staking.confirmation.hintRestake')}</StakingPopover.Item>
        </StakingPopover>
      </TransactionDetails>

      <div className="mt-3 flex w-full justify-between">
        {onGoBack && (
          <Button variant="text" onClick={onGoBack}>
            {t('operation.goBackButton')}
          </Button>
        )}

        <div className="flex gap-4">
          {secondaryActionButton}

          {!hideSignButton && !isMultisigExists && (
            <SignButton
              isDefault={Boolean(secondaryActionButton)}
              type={(signerWallet || initiatorWallet).type}
              onClick={confirmModel.startSigning}
            />
          )}
        </div>
      </div>
    </div>
  );
};

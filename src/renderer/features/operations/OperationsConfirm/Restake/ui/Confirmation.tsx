import { useStoreMap, useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { Button, DetailRow, FootnoteText, Icon, Tooltip } from '@/shared/ui';
import { TransactionDetails } from '@/shared/ui-entities';
import { AssetBalance } from '@/entities/asset';
import { SignButton } from '@/entities/operations';
import { AssetFiatBalance } from '@/entities/price';
import { AccountsModal, StakingPopover } from '@/entities/staking';
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

  const confirmStore = useStoreMap({
    store: confirmModel.$confirmStore,
    keys: [id],
    fn: (value, [id]) => value?.[id],
  });

  const initiatorWallet = useStoreMap({
    store: confirmModel.$initiatorWallets,
    keys: [id],
    fn: (value, [id]) => value?.[id],
  });

  const signerWallet = useStoreMap({
    store: confirmModel.$signerWallets,
    keys: [id],
    fn: (value, [id]) => value?.[id],
  });

  const isMultisigExists = useUnit(confirmModel.$isMultisigExists);

  const [isAccountsOpen, toggleAccounts] = useToggle();

  if (!confirmStore || !initiatorWallet) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col items-center gap-y-4 px-5 pb-4 pt-4">
        <div className="mb-2 flex flex-col items-center gap-y-3">
          <Icon className="text-icon-default" name="returnToStakeConfirm" size={60} />

          <div className="flex flex-col items-center gap-y-1">
            <AssetBalance
              value={confirmStore.amount}
              asset={confirmStore.asset}
              className="font-manrope text-[32px] font-bold leading-[36px] text-text-primary"
            />
            <AssetFiatBalance asset={confirmStore.asset} amount={confirmStore.amount} className="text-headline" />
          </div>
        </div>

        <MultisigExistsAlert active={isMultisigExists} />

        <TransactionDetails
          chain={confirmStore.chain}
          wallets={wallets}
          initiator={confirmStore.shards}
          signatory={confirmStore.signatory}
          proxied={confirmStore.proxiedAccount}
        >
          {confirmStore.shards?.[0] && accountUtils.isMultisigAccount(confirmStore.shards[0]) && (
            <DetailRow
              className="text-text-primary"
              label={
                <>
                  <Icon className="text-text-tertiary" name="lock" size={12} />
                  <FootnoteText className="text-text-tertiary">{t('staking.multisigDepositLabel')}</FootnoteText>
                  <Tooltip content={t('staking.tooltips.depositDescription')} offsetPx={-90}>
                    <Icon name="info" className="cursor-pointer hover:text-icon-hover" size={16} />
                  </Tooltip>
                </>
              }
            >
              <div className="flex flex-col items-end gap-y-0.5">
                <AssetBalance value={confirmStore.multisigDeposit} asset={confirmStore.chain.assets[0]} />
                <AssetFiatBalance asset={confirmStore.chain.assets[0]} amount={confirmStore.multisigDeposit} />
              </div>
            </DetailRow>
          )}

          <DetailRow
            label={
              <FootnoteText className="text-text-tertiary">
                {t('staking.networkFee', { count: confirmStore.shards.length || 1 })}
              </FootnoteText>
            }
            className="text-text-primary"
          >
            <div className="flex flex-col items-end gap-y-0.5">
              <AssetBalance value={confirmStore.fee} asset={confirmStore.chain.assets[0]} />
              <AssetFiatBalance asset={confirmStore.chain.assets[0]} amount={confirmStore.fee} />
            </div>
          </DetailRow>

          {confirmStore.shards.length > 1 && (
            <DetailRow
              label={<FootnoteText className="text-text-tertiary">{t('staking.networkFeeTotal')}</FootnoteText>}
              className="text-text-primary"
            >
              <div className="flex flex-col items-end gap-y-0.5">
                <AssetBalance value={confirmStore.totalFee} asset={confirmStore.chain.assets[0]} />
                <AssetFiatBalance asset={confirmStore.chain.assets[0]} amount={confirmStore.totalFee} />
              </div>
            </DetailRow>
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
                onClick={confirmModel.output.formSubmitted}
              />
            )}
          </div>
        </div>
      </div>

      <AccountsModal
        isOpen={isAccountsOpen}
        accounts={confirmStore.shards}
        amounts={['0']}
        chainId={confirmStore.chain.chainId}
        asset={confirmStore.asset}
        addressPrefix={confirmStore.chain.addressPrefix}
        onClose={toggleAccounts}
      />
    </>
  );
};

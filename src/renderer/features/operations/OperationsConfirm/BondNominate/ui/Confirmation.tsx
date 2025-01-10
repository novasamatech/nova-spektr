import { useStoreMap, useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { formatAmount, toAccountId } from '@/shared/lib/utils';
import { Button, CaptionText, DetailRow, FootnoteText, Icon } from '@/shared/ui';
import { Account, TransactionDetails } from '@/shared/ui-entities';
import { Tooltip } from '@/shared/ui-kit';
import { identityDomain } from '@/domains/identity';
import { AssetBalance } from '@/entities/asset';
import { SignButton } from '@/entities/operations';
import { AssetFiatBalance } from '@/entities/price';
import { AccountsModal, SelectedValidatorsModal, StakingPopover, UnstakingDuration } from '@/entities/staking';
import { accountUtils, walletModel } from '@/entities/wallet';
import { type Config } from '../../../OperationsValidation';
import { MultisigExistsAlert } from '../../common/MultisigExistsAlert';
import { confirmModel } from '../model/confirm-model';

type Props = {
  id?: number;
  secondaryActionButton?: ReactNode;
  hideSignButton?: boolean;
  config?: Config;

  onGoBack?: () => void;
};

export const Confirmation = ({
  id = 0,
  secondaryActionButton,
  hideSignButton,
  onGoBack,
  config = { withFormatAmount: true },
}: Props) => {
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

  const api = useStoreMap({
    store: confirmModel.$apis,
    keys: [confirmStore?.chain?.chainId],
    fn: (value, [chainId]) => value?.[chainId],
  });

  const eraLength = useStoreMap({
    store: confirmModel.$eraLength,
    keys: [confirmStore?.chain?.chainId],
    fn: (value, [chainId]) => value?.[chainId],
  });

  const identities = useStoreMap({
    store: identityDomain.identity.$list,
    keys: [confirmStore?.chain?.chainId],
    fn: (value, [chainId]) => value[chainId] ?? {},
  });

  const isMultisigExists = useUnit(confirmModel.$isMultisigExists);

  const [isAccountsOpen, toggleAccounts] = useToggle();
  const [isValidatorsOpen, toggleValidators] = useToggle();

  if (!confirmStore || !initiatorWallet) {
    return null;
  }

  const amountValue = config.withFormatAmount
    ? formatAmount(confirmStore.amount, confirmStore.asset.precision)
    : confirmStore.amount;

  return (
    <>
      <div className="flex w-modal flex-col items-center gap-y-4 px-5 pb-4 pt-4">
        <div className="mb-2 flex flex-col items-center gap-y-3">
          <Icon className="text-icon-default" name="startStakingConfirm" size={60} />

          <div className="flex flex-col items-center gap-y-1">
            <AssetBalance
              value={amountValue}
              asset={confirmStore.asset}
              className="font-manrope text-[32px] font-bold leading-[36px] text-text-primary"
            />
            <AssetFiatBalance asset={confirmStore.asset} amount={amountValue} className="text-headline" />
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
          <DetailRow label={t('staking.confirmation.validatorsLabel')}>
            <button
              type="button"
              className="group flex items-center gap-x-1 rounded px-2 py-1 hover:bg-action-background-hover"
              onClick={toggleValidators}
            >
              <div className="rounded-[30px] bg-icon-accent px-1.5 py-[1px]">
                <CaptionText className="text-white">{confirmStore.validators.length}</CaptionText>
              </div>
              <Icon className="group-hover:text-icon-hover" name="info" size={16} />
            </button>
          </DetailRow>

          <hr className="w-full border-filter-border pr-2" />

          <DetailRow label={t('staking.confirmation.rewardsDestinationLabel')}>
            {confirmStore.destination ? (
              <Account accountId={toAccountId(confirmStore.destination)} chain={confirmStore.chain} variant="short" />
            ) : (
              <FootnoteText>{t('staking.confirmation.restakeRewards')}</FootnoteText>
            )}
          </DetailRow>

          <hr className="w-full border-filter-border pr-2" />

          {accountUtils.isMultisigAccount(confirmStore.shards[0]) && (
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
                <AssetBalance value={confirmStore.multisigDeposit} asset={confirmStore.chain.assets[0]} />
                <AssetFiatBalance asset={confirmStore.chain.assets[0]} amount={confirmStore.multisigDeposit} />
              </div>
            </DetailRow>
          )}

          <DetailRow
            className="text-text-primary"
            label={
              <FootnoteText className="text-text-tertiary">
                {t('staking.networkFee', { count: confirmStore.shards.length || 1 })}
              </FootnoteText>
            }
          >
            <div className="flex flex-col items-end gap-y-0.5">
              <AssetBalance value={confirmStore.fee} asset={confirmStore.chain.assets[0]} />
              <AssetFiatBalance asset={confirmStore.chain.assets[0]} amount={confirmStore.fee} />
            </div>
          </DetailRow>

          {confirmStore.shards.length > 1 && (
            <DetailRow
              className="text-text-primary"
              label={<FootnoteText className="text-text-tertiary">{t('staking.networkFeeTotal')}</FootnoteText>}
            >
              <div className="flex flex-col items-end gap-y-0.5">
                <AssetBalance value={confirmStore.totalFee} asset={confirmStore.chain.assets[0]} />
                <AssetFiatBalance asset={confirmStore.chain.assets[0]} amount={confirmStore.totalFee} />
              </div>
            </DetailRow>
          )}

          <StakingPopover labelText={t('staking.confirmation.hintTitleStartStaking')}>
            <StakingPopover.Item>
              {t('staking.confirmation.hintRewards')}
              {' ('}
              {t('time.hours_other', { count: eraLength || 0 })}
              {')'}
            </StakingPopover.Item>
            <StakingPopover.Item>
              {t('staking.confirmation.hintUnstakePeriod')} {'('}
              <UnstakingDuration api={api} />
              {')'}
            </StakingPopover.Item>
            <StakingPopover.Item>{t('staking.confirmation.hintNoRewards')}</StakingPopover.Item>
            <StakingPopover.Item>{t('staking.confirmation.hintWithdraw')}</StakingPopover.Item>
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
        chainId={confirmStore.chain.chainId}
        asset={confirmStore.asset}
        addressPrefix={confirmStore.chain.addressPrefix}
        onClose={toggleAccounts}
      />

      <SelectedValidatorsModal
        isOpen={isValidatorsOpen}
        validators={confirmStore.validators}
        identities={identities}
        onClose={toggleValidators}
      />
    </>
  );
};

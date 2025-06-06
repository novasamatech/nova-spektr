import { useStoreMap, useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { formatAmount, toAccountId } from '@/shared/lib/utils';
import { Button, CaptionText, DetailRow, FootnoteText, Icon } from '@/shared/ui';
import { Account, AssetBalance, TransactionDetails } from '@/shared/ui-entities';
import { Tooltip } from '@/shared/ui-kit';
import { identity } from '@/domains/network';
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
  const confirms = useUnit(confirmModel.$confirms);

  const confirmStore = confirms[id];

  const initiatorWallet = confirmStore.wallets.initiator;

  const signerWallet = confirmStore.wallets.signatory;

  const api = useStoreMap({
    store: confirmModel.$apis,
    keys: [confirmStore?.meta.chain?.chainId],
    fn: (value, [chainId]) => value?.[chainId],
  });

  const eraLength = useStoreMap({
    store: confirmModel.$eraLength,
    keys: [confirmStore?.meta.chain?.chainId],
    fn: (value, [chainId]) => value?.[chainId],
  });

  const identities = useStoreMap({
    store: identity.$list,
    keys: [confirmStore?.meta.chain?.chainId],
    fn: (value, [chainId]) => value[chainId] ?? {},
  });

  const isMultisigExists = useUnit(confirmModel.$isMultisigExists);

  const [isAccountsOpen, toggleAccounts] = useToggle();
  const [isValidatorsOpen, toggleValidators] = useToggle();

  if (!confirmStore || !initiatorWallet) {
    return null;
  }

  const amountValue = config.withFormatAmount
    ? formatAmount(confirmStore.meta.amount, confirmStore.meta.asset.precision)
    : confirmStore.meta.amount;

  const proxiedAccount = confirmStore.meta.route.find(accountUtils.isProxiedAccount);

  return (
    <>
      <div className="flex w-modal flex-col items-center gap-y-4 px-5 pb-4 pt-4">
        <div className="mb-2 flex flex-col items-center gap-y-3">
          <Icon className="text-icon-default" name="startStakingConfirm" size={60} />

          <div className="flex flex-col items-center gap-y-1">
            <AssetBalance
              value={amountValue}
              asset={confirmStore.meta.asset}
              className="font-manrope text-[32px] font-bold leading-[36px] text-text-primary"
            />
            <AssetFiatBalance asset={confirmStore.meta.asset} amount={amountValue} className="text-headline" />
          </div>
        </div>

        <MultisigExistsAlert active={isMultisigExists} />

        <TransactionDetails
          chain={confirmStore.meta.chain}
          wallets={wallets}
          initiator={confirms.map((confirm) => confirm.meta.initiator)}
          signatory={confirmStore.meta.signatory}
          proxied={proxiedAccount}
        >
          <DetailRow label={t('staking.confirmation.validatorsLabel')}>
            <button
              type="button"
              className="group flex items-center gap-x-1 rounded px-2 py-1 hover:bg-action-background-hover"
              onClick={toggleValidators}
            >
              <div className="rounded-[30px] bg-icon-accent px-1.5 py-[1px]">
                <CaptionText className="text-white">{confirmStore.meta.validators.length}</CaptionText>
              </div>
              <Icon className="group-hover:text-icon-hover" name="info" size={16} />
            </button>
          </DetailRow>

          <hr className="w-full border-filter-border pr-2" />

          <DetailRow label={t('staking.confirmation.rewardsDestinationLabel')}>
            {confirmStore.meta.destination ? (
              <Account
                accountId={toAccountId(confirmStore.meta.destination)}
                chain={confirmStore.meta.chain}
                variant="short"
              />
            ) : (
              <FootnoteText>{t('staking.confirmation.restakeRewards')}</FootnoteText>
            )}
          </DetailRow>

          <hr className="w-full border-filter-border pr-2" />

          {isMultisigExists && (
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
                <AssetBalance value={confirmStore.meta.multisigDeposit} asset={confirmStore.meta.chain.assets[0]} />
                <AssetFiatBalance
                  asset={confirmStore.meta.chain.assets[0]}
                  amount={confirmStore.meta.multisigDeposit}
                />
              </div>
            </DetailRow>
          )}

          <DetailRow
            className="text-text-primary"
            label={
              <FootnoteText className="text-text-tertiary">
                {t('staking.networkFee', { count: confirms.length || 1 })}
              </FootnoteText>
            }
          >
            <div className="flex flex-col items-end gap-y-0.5">
              <AssetBalance value={confirmStore.meta.fee} asset={confirmStore.meta.chain.assets[0]} />
              <AssetFiatBalance asset={confirmStore.meta.chain.assets[0]} amount={confirmStore.meta.fee} />
            </div>
          </DetailRow>

          {confirms.length > 1 && (
            <DetailRow
              className="text-text-primary"
              label={<FootnoteText className="text-text-tertiary">{t('staking.networkFeeTotal')}</FootnoteText>}
            >
              <div className="flex flex-col items-end gap-y-0.5">
                <AssetBalance value={confirmStore.meta.totalFee} asset={confirmStore.meta.chain.assets[0]} />
                <AssetFiatBalance asset={confirmStore.meta.chain.assets[0]} amount={confirmStore.meta.totalFee} />
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
                onClick={confirmModel.startSigning}
              />
            )}
          </div>
        </div>
      </div>

      <AccountsModal
        isOpen={isAccountsOpen}
        accounts={confirms.map((confirm) => confirm.meta.initiator)}
        chainId={confirmStore.meta.chain.chainId}
        asset={confirmStore.meta.asset}
        addressPrefix={confirmStore.meta.chain.addressPrefix}
        onClose={toggleAccounts}
      />

      <SelectedValidatorsModal
        isOpen={isValidatorsOpen}
        validators={confirmStore.meta.validators}
        identities={identities}
        onClose={toggleValidators}
      />
    </>
  );
};

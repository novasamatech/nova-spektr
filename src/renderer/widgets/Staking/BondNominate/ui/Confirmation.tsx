import { useUnit } from 'effector-react';

import { Button, DetailRow, FootnoteText, Icon, Tooltip, CaptionText } from '@shared/ui';
import { useI18n } from '@app/providers';
import { SignButton } from '@entities/operations';
import { AddressWithExplorers, WalletIcon, ExplorersPopover, WalletCardSm, accountUtils } from '@entities/wallet';
import { cnTw, formatAmount } from '@shared/lib/utils';
import { AssetBalance } from '@entities/asset';
import { AssetFiatBalance } from '@entities/price/ui/AssetFiatBalance';
import { confirmModel } from '../model/confirm-model';
import { AccountsModal, StakingPopover, UnstakingDuration, SelectedValidatorsModal } from '@entities/staking';
import { useToggle } from '@shared/lib/hooks';
import { FeeLoader } from '@entities/transaction';
import { priceProviderModel } from '@entities/price';

type Props = {
  onGoBack: () => void;
};

export const Confirmation = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const confirmStore = useUnit(confirmModel.$confirmStore);
  const initiatorWallet = useUnit(confirmModel.$initiatorWallet);
  const signerWallet = useUnit(confirmModel.$signerWallet);
  const proxiedWallet = useUnit(confirmModel.$proxiedWallet);

  const feeData = useUnit(confirmModel.$feeData);
  const isFeeLoading = useUnit(confirmModel.$isFeeLoading);
  const eraLength = useUnit(confirmModel.$eraLength);

  const api = useUnit(confirmModel.$api);
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

  const [isAccountsOpen, toggleAccounts] = useToggle();
  const [isValidatorsOpen, toggleValidators] = useToggle();

  if (!confirmStore || !initiatorWallet) return null;

  return (
    <>
      <div className="flex flex-col items-center pt-4 gap-y-4 pb-4 px-5 w-modal">
        <div className="flex flex-col items-center gap-y-3 mb-2">
          <Icon className="text-icon-default" name="startStakingConfirm" size={60} />

          <div className={cnTw('flex flex-col gap-y-1 items-center')}>
            <AssetBalance
              value={formatAmount(confirmStore.amount, confirmStore.asset.precision)}
              asset={confirmStore.asset}
              className="font-manrope text-text-primary text-[32px] leading-[36px] font-bold"
            />
            <AssetFiatBalance
              asset={confirmStore.asset}
              amount={formatAmount(confirmStore.amount, confirmStore.asset.precision)}
              className="text-headline"
            />
          </div>

          <FootnoteText className="py-2 px-3 rounded bg-block-background ml-3 text-text-secondary">
            {confirmStore.description}
          </FootnoteText>
        </div>

        <dl className="flex flex-col gap-y-4 w-full">
          {proxiedWallet && confirmStore.proxiedAccount && (
            <>
              <DetailRow label={t('transfer.senderProxiedWallet')} className="flex gap-x-2">
                <WalletIcon type={proxiedWallet.type} size={16} />
                <FootnoteText className="pr-2">{proxiedWallet.name}</FootnoteText>
              </DetailRow>

              <DetailRow label={t('transfer.senderAccount')}>
                <AddressWithExplorers
                  type="short"
                  explorers={confirmStore.chain.explorers}
                  addressFont="text-footnote text-inherit"
                  accountId={confirmStore.proxiedAccount.accountId}
                  addressPrefix={confirmStore.chain.addressPrefix}
                  wrapperClassName="text-text-secondary"
                />
              </DetailRow>

              <hr className="border-filter-border w-full pr-2" />

              <DetailRow label={t('transfer.signingWallet')} className="flex gap-x-2">
                <WalletIcon type={initiatorWallet.type} size={16} />
                <FootnoteText className="pr-2">{initiatorWallet.name}</FootnoteText>
              </DetailRow>

              <DetailRow label={t('transfer.signingAccount')}>
                <AddressWithExplorers
                  type="short"
                  explorers={confirmStore.chain.explorers}
                  addressFont="text-footnote text-inherit"
                  accountId={confirmStore.proxiedAccount.proxyAccountId}
                  addressPrefix={confirmStore.chain.addressPrefix}
                  wrapperClassName="text-text-secondary"
                />
              </DetailRow>
            </>
          )}

          {!proxiedWallet && (
            <>
              <DetailRow label={t('proxy.details.wallet')} className="flex gap-x-2">
                <WalletIcon type={initiatorWallet.type} size={16} />
                <FootnoteText className="pr-2">{initiatorWallet.name}</FootnoteText>
              </DetailRow>

              <DetailRow label={t('staking.confirmation.accountLabel', { count: confirmStore.shards.length })}>
                {confirmStore.shards.length > 1 ? (
                  <button
                    type="button"
                    className="flex items-center gap-x-1 group hover:bg-action-background-hover px-2 py-1 rounded"
                    onClick={toggleAccounts}
                  >
                    <div className="rounded-[30px] px-1.5 py-[1px] bg-icon-accent">
                      <CaptionText className="text-white">{confirmStore.shards.length}</CaptionText>
                    </div>
                    <Icon className="group-hover:text-icon-hover" name="info" size={16} />
                  </button>
                ) : (
                  <AddressWithExplorers
                    type="short"
                    wrapperClassName="text-text-secondary"
                    explorers={confirmStore.chain.explorers}
                    accountId={confirmStore.shards[0].accountId}
                    addressPrefix={confirmStore.chain.addressPrefix}
                  />
                )}
              </DetailRow>
            </>
          )}

          {signerWallet && confirmStore.signatory && (
            <DetailRow label={t('proxy.details.signatory')}>
              <ExplorersPopover
                button={<WalletCardSm wallet={signerWallet} />}
                address={confirmStore.signatory.accountId}
                explorers={confirmStore.chain.explorers}
                addressPrefix={confirmStore.chain.addressPrefix}
              />
            </DetailRow>
          )}

          <DetailRow label={t('staking.confirmation.validatorsLabel')}>
            <button
              type="button"
              className="flex items-center gap-x-1 px-2 py-1 rounded group hover:bg-action-background-hover"
              onClick={toggleValidators}
            >
              <div className="rounded-[30px] px-1.5 py-[1px] bg-icon-accent">
                <CaptionText className="text-white">{confirmStore.validators.length}</CaptionText>
              </div>
              <Icon className="group-hover:text-icon-hover" name="info" size={16} />
            </button>
          </DetailRow>

          <hr className="border-filter-border w-full pr-2" />
          <DetailRow label={t('staking.confirmation.rewardsDestinationLabel')}>
            {confirmStore.destination ? (
              <AddressWithExplorers
                address={confirmStore.destination}
                explorers={confirmStore.chain.explorers}
                type="short"
              />
            ) : (
              <FootnoteText>{t('staking.confirmation.restakeRewards')}</FootnoteText>
            )}
          </DetailRow>

          <hr className="border-filter-border w-full pr-2" />

          {accountUtils.isMultisigAccount(confirmStore.shards[0]) && (
            <DetailRow
              className="text-text-primary"
              label={
                <>
                  <Icon className="text-text-tertiary" name="lock" size={12} />
                  <FootnoteText className="text-text-tertiary">{t('staking.multisigDepositLabel')}</FootnoteText>
                  <Tooltip content={t('staking.tooltips.depositDescription')} offsetPx={-90}>
                    <Icon name="info" className="hover:text-icon-hover cursor-pointer" size={16} />
                  </Tooltip>
                </>
              }
            >
              <div className="flex flex-col gap-y-0.5 items-end">
                <AssetBalance value={feeData.multisigDeposit} asset={confirmStore.chain.assets[0]} />
                <AssetFiatBalance asset={confirmStore.chain.assets[0]} amount={feeData.multisigDeposit} />
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
            {isFeeLoading ? (
              <FeeLoader fiatFlag={Boolean(fiatFlag)} />
            ) : (
              <div className="flex flex-col gap-y-0.5 items-end">
                <AssetBalance value={feeData.fee} asset={confirmStore.chain.assets[0]} />
                <AssetFiatBalance asset={confirmStore.chain.assets[0]} amount={feeData.fee} />
              </div>
            )}
          </DetailRow>

          {confirmStore.shards.length > 1 && (
            <DetailRow
              className="text-text-primary"
              label={<FootnoteText className="text-text-tertiary">{t('staking.networkFeeTotal')}</FootnoteText>}
            >
              {isFeeLoading ? (
                <FeeLoader fiatFlag={Boolean(fiatFlag)} />
              ) : (
                <div className="flex flex-col gap-y-0.5 items-end">
                  <AssetBalance value={feeData.totalFee} asset={confirmStore.chain.assets[0]} />
                  <AssetFiatBalance asset={confirmStore.chain.assets[0]} amount={feeData.totalFee} />
                </div>
              )}
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
        </dl>

        <div className="flex w-full justify-between mt-3">
          <Button variant="text" onClick={onGoBack}>
            {t('operation.goBackButton')}
          </Button>

          <SignButton
            disabled={isFeeLoading}
            type={(signerWallet || initiatorWallet).type}
            onClick={confirmModel.output.formSubmitted}
          />
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
        onClose={toggleValidators}
      />
    </>
  );
};

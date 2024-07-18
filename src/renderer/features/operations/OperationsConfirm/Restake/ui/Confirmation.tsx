import { useStoreMap } from 'effector-react';
import { type ReactNode } from 'react';

import { useI18n } from '@app/providers';
import { useToggle } from '@shared/lib/hooks';
import { cnTw } from '@shared/lib/utils';
import { Button, CaptionText, DetailRow, FootnoteText, Icon, Tooltip } from '@shared/ui';
import { AssetBalance } from '@entities/asset';
import { SignButton } from '@entities/operations';
import { AssetFiatBalance } from '@entities/price/ui/AssetFiatBalance';
import { AccountsModal, StakingPopover } from '@entities/staking';
import { AddressWithExplorers, ExplorersPopover, WalletCardSm, WalletIcon, accountUtils } from '@entities/wallet';
import { confirmModel } from '../model/confirm-model';

type Props = {
  id?: number;
  secondaryActionButton?: ReactNode;
  hideSignButton?: boolean;
  onGoBack?: () => void;
};

export const Confirmation = ({ id = 0, onGoBack, secondaryActionButton, hideSignButton }: Props) => {
  const { t } = useI18n();

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

  const proxiedWallet = useStoreMap({
    store: confirmModel.$proxiedWallets,
    keys: [id],
    fn: (value, [id]) => value?.[id],
  });

  const [isAccountsOpen, toggleAccounts] = useToggle();

  if (!confirmStore || !initiatorWallet) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col items-center pt-4 gap-y-4 pb-4 px-5">
        <div className="flex flex-col items-center gap-y-3 mb-2">
          <Icon className="text-icon-default" name="returnToStakeConfirm" size={60} />

          <div className={cnTw('flex flex-col gap-y-1 items-center')}>
            <AssetBalance
              value={confirmStore.amount}
              asset={confirmStore.asset}
              className="font-manrope text-text-primary text-[32px] leading-[36px] font-bold"
            />
            <AssetFiatBalance asset={confirmStore.asset} amount={confirmStore.amount} className="text-headline" />
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

              <DetailRow label={t('transfer.senderProxiedAccount')}>
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
                    className={cnTw(
                      'flex items-center gap-x-1',
                      'group hover:bg-action-background-hover px-2 py-1 rounded',
                    )}
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
            <div className="flex flex-col gap-y-0.5 items-end">
              <AssetBalance value={confirmStore.fee} asset={confirmStore.chain.assets[0]} />
              <AssetFiatBalance asset={confirmStore.chain.assets[0]} amount={confirmStore.fee} />
            </div>
          </DetailRow>

          {confirmStore.shards.length > 1 && (
            <DetailRow
              label={<FootnoteText className="text-text-tertiary">{t('staking.networkFeeTotal')}</FootnoteText>}
              className="text-text-primary"
            >
              <div className="flex flex-col gap-y-0.5 items-end">
                <AssetBalance value={confirmStore.totalFee} asset={confirmStore.chain.assets[0]} />
                <AssetFiatBalance asset={confirmStore.chain.assets[0]} amount={confirmStore.totalFee} />
              </div>
            </DetailRow>
          )}

          <StakingPopover labelText={t('staking.confirmation.hintTitle')}>
            <StakingPopover.Item>{t('staking.confirmation.hintRestake')}</StakingPopover.Item>
          </StakingPopover>
        </dl>

        <div className="flex w-full justify-between mt-3">
          {onGoBack && (
            <Button variant="text" onClick={onGoBack}>
              {t('operation.goBackButton')}
            </Button>
          )}

          <div className="flex gap-4">
            {secondaryActionButton}

            {!hideSignButton && (
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

import { BN } from '@polkadot/util';
import { useStoreMap } from 'effector-react';
import { type ReactNode } from 'react';

import { useI18n } from '@app/providers';
import { useToggle } from '@/shared/lib/hooks';
import { cnTw } from '@shared/lib/utils';
import { Button, CaptionText, DetailRow, FootnoteText, Icon, Tooltip } from '@shared/ui';
import { ValueIndicator } from '@/entities/governance';
import { SignButton } from '@/entities/operations';
import { AccountsModal } from '@/entities/staking';
import { AddressWithExplorers, ExplorersPopover, WalletCardSm, WalletIcon, accountUtils } from '@/entities/wallet';
import { AssetBalance } from '@entities/asset';
import { AssetFiatBalance } from '@entities/price/ui/AssetFiatBalance';
import { basketUtils } from '@/features/operations/OperationsConfirm';
import { unlockConfirmAggregate } from '../aggregates/unlockConfirm';

type Props = {
  id?: number;
  secondaryActionButton?: ReactNode;
  hideSignButton?: boolean;
  onGoBack?: () => void;
};

export const UnlockConfirmation = ({ id = 0, hideSignButton, secondaryActionButton, onGoBack }: Props) => {
  const { t } = useI18n();

  const confirmStore = useStoreMap({
    store: unlockConfirmAggregate.$confirmStore,
    keys: [id],
    fn: (value, [id]) => value?.[id],
  });

  const initiatorWallet = useStoreMap({
    store: unlockConfirmAggregate.$initiatorWallets,
    keys: [id],
    fn: (value, [id]) => value?.[id],
  });

  const signerWallet = useStoreMap({
    store: unlockConfirmAggregate.$signerWallets,
    keys: [id],
    fn: (value, [id]) => value?.[id],
  });

  const proxiedWallet = useStoreMap({
    store: unlockConfirmAggregate.$proxiedWallets,
    keys: [id],
    fn: (value, [id]) => value?.[id],
  });

  const transferableAmount = useStoreMap({
    store: unlockConfirmAggregate.$transferableAmount,
    keys: [id],
    fn: (value, [id]) => value?.[id],
  });

  const [isAccountsOpen, toggleAccounts] = useToggle();

  if (!confirmStore || !initiatorWallet || !confirmStore.chain) return null;

  const { chain, asset, amount, shards, totalLock } = confirmStore;

  return (
    <>
      <div className="flex flex-col items-center pt-4 gap-y-4 pb-4 px-5 w-modal">
        <div className="flex flex-col items-center gap-y-3 mb-2">
          <Icon className="text-icon-default" name="unlockMst" size={60} />

          <div className={cnTw('flex flex-col gap-y-1 items-center')}>
            <AssetBalance
              value={amount}
              asset={asset}
              className="font-manrope text-text-primary text-[32px] leading-[36px] font-bold"
            />
            <AssetFiatBalance asset={asset} amount={amount} className="text-headline" />
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
                  explorers={chain.explorers}
                  addressFont="text-footnote text-inherit"
                  accountId={confirmStore.proxiedAccount.accountId}
                  addressPrefix={chain.addressPrefix}
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
                  explorers={chain.explorers}
                  addressFont="text-footnote text-inherit"
                  accountId={confirmStore.proxiedAccount.proxyAccountId}
                  addressPrefix={chain.addressPrefix}
                  wrapperClassName="text-text-secondary"
                />
              </DetailRow>
            </>
          )}

          {!proxiedWallet && (
            <>
              <DetailRow label={t('operation.details.wallet')} className="flex gap-x-2">
                <WalletIcon type={initiatorWallet.type} size={16} />
                <FootnoteText className="pr-2">{initiatorWallet.name}</FootnoteText>
              </DetailRow>

              <DetailRow label={t('operation.details.account')}>
                {shards.length > 1 ? (
                  <button
                    type="button"
                    className={cnTw(
                      'flex items-center gap-x-1',
                      'group hover:bg-action-background-hover px-2 py-1 rounded',
                    )}
                    onClick={toggleAccounts}
                  >
                    <div className="rounded-[30px] px-1.5 py-[1px] bg-icon-accent">
                      <CaptionText className="text-white">{shards.length}</CaptionText>
                    </div>
                    <Icon className="group-hover:text-icon-hover" name="info" size={16} />
                  </button>
                ) : (
                  <AddressWithExplorers
                    type="short"
                    wrapperClassName="text-text-secondary"
                    addressFont="text-footnote text-inherit"
                    explorers={chain.explorers}
                    accountId={shards[0].accountId}
                    addressPrefix={chain.addressPrefix}
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
                explorers={chain.explorers}
                addressPrefix={chain.addressPrefix}
              />
            </DetailRow>
          )}

          <hr className="border-filter-border w-full pr-2" />

          <DetailRow label={t('governance.operations.transferable')} wrapperClassName="items-start">
            <ValueIndicator
              from={transferableAmount.toString()}
              to={transferableAmount.add(new BN(amount)).toString()}
              asset={asset}
            />
          </DetailRow>
          <DetailRow label={t('governance.locks.governanceLock')} wrapperClassName="items-start">
            <ValueIndicator from={totalLock.toString()} to={totalLock.sub(new BN(amount)).toString()} asset={asset} />
          </DetailRow>

          <hr className="border-filter-border w-full pr-2" />

          {accountUtils.isMultisigAccount(shards[0]) && (
            <DetailRow
              className="text-text-primary"
              label={
                <>
                  <Icon className="text-text-tertiary" name="lock" size={12} />
                  <FootnoteText className="text-text-tertiary">{t('operation.details.deposit')}</FootnoteText>
                  <Tooltip content={t('transfer.networkDepositHint')} offsetPx={-90}>
                    <Icon name="info" className="hover:text-icon-hover cursor-pointer" size={16} />
                  </Tooltip>
                </>
              }
            >
              <div className="flex flex-col gap-y-0.5 items-end">
                <AssetBalance value={confirmStore.multisigDeposit} asset={chain.assets[0]} />
                <AssetFiatBalance asset={chain.assets[0]} amount={confirmStore.multisigDeposit} />
              </div>
            </DetailRow>
          )}

          <DetailRow
            label={
              <FootnoteText className="text-text-tertiary">
                {t('operation.networkFee', { count: shards.length || 1 })}
              </FootnoteText>
            }
            className="text-text-primary"
          >
            <div className="flex flex-col gap-y-0.5 items-end">
              <AssetBalance value={confirmStore.fee} asset={chain.assets[0]} />
              <AssetFiatBalance asset={chain.assets[0]} amount={confirmStore.fee} />
            </div>
          </DetailRow>

          {shards.length > 1 && (
            <DetailRow
              label={<FootnoteText className="text-text-tertiary">{t('operation.networkFeeTotal')}</FootnoteText>}
              className="text-text-primary"
            >
              <div className="flex flex-col gap-y-0.5 items-end">
                <AssetBalance value={confirmStore.totalFee} asset={chain.assets[0]} />
                <AssetFiatBalance asset={chain.assets[0]} amount={confirmStore.totalFee} />
              </div>
            </DetailRow>
          )}
        </dl>

        <div className="flex w-full justify-between mt-3">
          {onGoBack && (
            <Button variant="text" onClick={onGoBack}>
              {t('operation.goBackButton')}
            </Button>
          )}

          <div className="flex gap-4">
            {basketUtils.isBasketAvailable(initiatorWallet) && secondaryActionButton}
            {!hideSignButton && (
              <SignButton
                isDefault={basketUtils.isBasketAvailable(initiatorWallet) && Boolean(secondaryActionButton)}
                type={(signerWallet || initiatorWallet).type}
                onClick={unlockConfirmAggregate.output.formSubmitted}
              />
            )}
          </div>
        </div>
      </div>

      <AccountsModal
        isOpen={isAccountsOpen}
        accounts={shards}
        chainId={chain.chainId}
        asset={asset}
        addressPrefix={chain.addressPrefix}
        onClose={toggleAccounts}
      />
    </>
  );
};

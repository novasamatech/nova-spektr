import { BN } from '@polkadot/util';
import { useStoreMap, useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { Button, DetailRow, FootnoteText, Icon, Loader } from '@/shared/ui';
import { TransactionDetails } from '@/shared/ui-entities';
import { Box, Tooltip } from '@/shared/ui-kit';
import { AssetBalance } from '@/entities/asset';
import { BalanceDiff } from '@/entities/governance';
import { SignButton } from '@/entities/operations';
import { AssetFiatBalance } from '@/entities/price';
import { AccountsModal } from '@/entities/staking';
import { accountUtils, walletModel } from '@/entities/wallet';
import { basketUtils } from '@/features/operations/OperationsConfirm';
import { MultisigExistsAlert } from '@/features/operations/OperationsConfirm/common/MultisigExistsAlert';
import { unlockConfirmAggregate } from '../aggregates/unlockConfirm';

type Props = {
  id?: number;
  secondaryActionButton?: ReactNode;
  hideSignButton?: boolean;
  onGoBack?: () => void;
};

export const UnlockConfirmation = ({ id = 0, hideSignButton, secondaryActionButton, onGoBack }: Props) => {
  const { t } = useI18n();
  const wallets = useUnit(walletModel.$wallets);

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

  const transferableAmount = useStoreMap({
    store: unlockConfirmAggregate.$transferableAmount,
    keys: [id],
    fn: (value, [id]) => value?.[id],
  });

  const isMultisigExists = useUnit(unlockConfirmAggregate.$isMultisigExists);

  const [isAccountsOpen, toggleAccounts] = useToggle();

  if (!confirmStore || !initiatorWallet || !confirmStore.chain) {
    return (
      <Box width="440px" height="430px" verticalAlign="center" horizontalAlign="center">
        <Loader color="primary" />
      </Box>
    );
  }
  const { chain, asset, amount, shards, totalLock } = confirmStore;

  return (
    <>
      <div className="flex w-modal flex-col items-center gap-y-4 px-5 pb-4 pt-4">
        <div className="mb-2 flex flex-col items-center gap-y-3">
          <Icon className="text-icon-default" name="unlockMst" size={60} />

          <div className="flex flex-col items-center gap-y-1">
            <AssetBalance
              value={amount}
              asset={asset}
              className="font-manrope text-[32px] font-bold leading-[36px] text-text-primary"
            />
            <AssetFiatBalance asset={asset} amount={amount} className="text-headline" />
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
          <DetailRow label={t('governance.operations.transferable')} wrapperClassName="items-start">
            <BalanceDiff from={transferableAmount} to={transferableAmount.add(new BN(amount))} asset={asset} />
          </DetailRow>
          <DetailRow label={t('governance.locks.governanceLock')} wrapperClassName="items-start">
            <BalanceDiff from={totalLock} to={totalLock.sub(new BN(amount))} asset={asset} />
          </DetailRow>

          {/* TODO: add undelegate period */}
          {/* <DetailRow label={t('governance.locks.undelegatePeriod')} wrapperClassName="items-start">
            <ValueIndicator
              from={totalLock.toString()}
              to={totalLock.sub(new BN(confirmStore.amount)).toString()}
              asset={asset}
            />
          </DetailRow> */}

          <hr className="w-full border-filter-border pr-2" />

          {shards?.[0] && accountUtils.isMultisigAccount(shards[0]) && (
            <DetailRow
              className="text-text-primary"
              label={
                <>
                  <Icon className="text-text-tertiary" name="lock" size={12} />
                  <FootnoteText className="text-text-tertiary">{t('operation.details.deposit')}</FootnoteText>
                  <Tooltip>
                    <Tooltip.Trigger>
                      <div tabIndex={0}>
                        <Icon name="info" className="cursor-pointer hover:text-icon-hover" size={16} />
                      </div>
                    </Tooltip.Trigger>
                    <Tooltip.Content>{t('transfer.networkDepositHint')}</Tooltip.Content>
                  </Tooltip>
                </>
              }
            >
              <div className="flex flex-col items-end gap-y-0.5">
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
            <div className="flex flex-col items-end gap-y-0.5">
              <AssetBalance value={confirmStore.fee} asset={chain.assets[0]} />
              <AssetFiatBalance asset={chain.assets[0]} amount={confirmStore.fee} />
            </div>
          </DetailRow>

          {shards.length > 1 && (
            <DetailRow
              label={<FootnoteText className="text-text-tertiary">{t('operation.networkFeeTotal')}</FootnoteText>}
              className="text-text-primary"
            >
              <div className="flex flex-col items-end gap-y-0.5">
                <AssetBalance value={confirmStore.totalFee} asset={chain.assets[0]} />
                <AssetFiatBalance asset={chain.assets[0]} amount={confirmStore.totalFee} />
              </div>
            </DetailRow>
          )}
        </TransactionDetails>

        <div className="mt-3 flex w-full justify-between">
          {onGoBack && (
            <Button variant="text" onClick={onGoBack}>
              {t('operation.goBackButton')}
            </Button>
          )}

          <div className="flex gap-4">
            {basketUtils.isBasketAvailable(initiatorWallet) && secondaryActionButton}
            {!hideSignButton && !isMultisigExists && (
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

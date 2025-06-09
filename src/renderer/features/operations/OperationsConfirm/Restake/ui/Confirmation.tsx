import { useStoreMap, useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { getNativeAsset } from '@/shared/lib/utils';
import { Button, DetailRow, FootnoteText, Icon } from '@/shared/ui';
import { AssetBalance, TransactionDetails } from '@/shared/ui-entities';
import { Tooltip } from '@/shared/ui-kit';
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
    store: confirmModel.$confirmMap,
    keys: [id],
    fn: (value, [id]) => value?.[id],
  });

  // TODO use confirms from the createTransactionConfirmStore
  const confirms = useStoreMap(confirmModel.$confirmMap, (confirmMap) => Object.values(confirmMap));

  const initiatorWallet = confirmStore.wallets.initiator;
  const signerWallet = confirmStore.wallets.signatory;
  const isMultisigExists = useUnit(confirmModel.$isMultisigExists);
  const proxiedAccount = confirmStore.meta.route.find(accountUtils.isProxiedAccount);
  const nativeAsset = getNativeAsset(confirmStore.meta.chain.assets);

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
              value={confirmStore.meta.amount}
              asset={confirmStore.meta.asset}
              className="font-manrope text-[32px] font-bold leading-[36px] text-text-primary"
            />
            <AssetFiatBalance
              asset={confirmStore.meta.asset}
              amount={confirmStore.meta.amount}
              className="text-headline"
            />
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
                <AssetBalance value={confirmStore.meta.multisigDeposit} asset={nativeAsset} />
                <AssetFiatBalance asset={nativeAsset} amount={confirmStore.meta.multisigDeposit} />
              </div>
            </DetailRow>
          )}

          <DetailRow
            label={
              <FootnoteText className="text-text-tertiary">
                {t('staking.networkFee', { count: confirms.length || 1 })}
              </FootnoteText>
            }
            className="text-text-primary"
          >
            <div className="flex flex-col items-end gap-y-0.5">
              <AssetBalance value={confirmStore.meta.fee} asset={nativeAsset} />
              <AssetFiatBalance asset={nativeAsset} amount={confirmStore.meta.fee} />
            </div>
          </DetailRow>

          {confirms.length > 1 && (
            <DetailRow
              label={<FootnoteText className="text-text-tertiary">{t('staking.networkFeeTotal')}</FootnoteText>}
              className="text-text-primary"
            >
              <div className="flex flex-col items-end gap-y-0.5">
                <AssetBalance value={confirmStore.meta.totalFee} asset={nativeAsset} />
                <AssetFiatBalance asset={nativeAsset} amount={confirmStore.meta.totalFee} />
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
                onClick={confirmModel.startSigning}
              />
            )}
          </div>
        </div>
      </div>

      <AccountsModal
        isOpen={isAccountsOpen}
        accounts={confirms.map((confirm) => confirm.meta.initiator)}
        amounts={['0']}
        chainId={confirmStore.meta.chain.chainId}
        asset={confirmStore.meta.asset}
        addressPrefix={confirmStore.meta.chain.addressPrefix}
        onClose={toggleAccounts}
      />
    </>
  );
};

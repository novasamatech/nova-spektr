import { useStoreMap, useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { Button, DetailRow, FootnoteText, Icon } from '@/shared/ui';
import { AssetBalance, TransactionDetails } from '@/shared/ui-entities';
import { Tooltip } from '@/shared/ui-kit';
import { SignButton } from '@/entities/operations';
import { AssetFiatBalance } from '@/entities/price';
import { AccountsModal } from '@/entities/staking';
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

export const Confirmation = ({ id = 0, secondaryActionButton, hideSignButton, onGoBack }: Props) => {
  const { t } = useI18n();
  const wallets = useUnit(walletModel.$wallets);

  const confirmStore = useStoreMap({
    store: confirmModel.$confirmMap,
    keys: [id],
    fn: (value, [id]) => value?.[id] ?? null,
  });

  const { asset, amount, chain, initiator, signatory, multisigDeposit, fee } = confirmStore.meta;

  const isMultisigExists = useUnit(confirmModel.$isMultisigExists);

  const hasMultisigAccount = confirmStore.meta.route.find(accountUtils.isAnyMultisigAccount) ?? null;

  const [isAccountsOpen, toggleAccounts] = useToggle();

  if (!confirmStore) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col items-center gap-y-4 px-5 pt-4 pb-4">
        <div className="mb-2 flex flex-col items-center gap-y-3">
          <Icon className="text-icon-default" name="redeemConfirm" size={60} />

          <div className="flex flex-col items-center gap-y-1">
            <AssetBalance
              value={amount}
              asset={asset}
              className="font-manrope text-[32px] leading-[36px] font-bold text-text-primary"
            />
            <AssetFiatBalance asset={asset} amount={amount} className="text-headline" />
          </div>
        </div>

        <MultisigExistsAlert active={isMultisigExists} />

        <TransactionDetails chain={chain} wallets={wallets} initiators={[initiator]} signatory={signatory}>
          {hasMultisigAccount && (
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
                <AssetBalance value={multisigDeposit} asset={chain.assets[0]} />
                <AssetFiatBalance asset={chain.assets[0]} amount={multisigDeposit} />
              </div>
            </DetailRow>
          )}

          <FeeWithLabel fee={fee} asset={chain.assets[0]} label={t('staking.networkFee', { count: 1 })} />
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
                type={confirmStore.wallets.signatory.type}
                onClick={confirmModel.startSigning}
              />
            )}
          </div>
        </div>
      </div>

      <AccountsModal
        isOpen={isAccountsOpen}
        accounts={[initiator]}
        amounts={['0']}
        chainId={chain.chainId}
        asset={asset}
        addressPrefix={chain.addressPrefix}
        onClose={toggleAccounts}
      />
    </>
  );
};

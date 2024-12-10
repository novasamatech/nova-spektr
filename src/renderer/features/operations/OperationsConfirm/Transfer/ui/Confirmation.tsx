import { useStoreMap, useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { useI18n } from '@/shared/i18n';
import { toAccountId } from '@/shared/lib/utils';
import { Button, DetailRow, FootnoteText, Icon, Tooltip } from '@/shared/ui';
import { Account, TransactionDetails } from '@/shared/ui-entities';
import { AssetBalance } from '@/entities/asset';
import { ChainTitle } from '@/entities/chain';
import { SignButton } from '@/entities/operations';
import { AssetFiatBalance } from '@/entities/price';
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

  const isXcm = useStoreMap({
    store: confirmModel.$isXcm,
    keys: [id],
    fn: (value, [id]) => value?.[id],
  });

  const isMultisigExists = useUnit(confirmModel.$isMultisigExists);

  if (!confirmStore || !initiatorWallet) {
    return null;
  }

  return (
    <div className="flex w-modal flex-col items-center gap-y-4 px-5 pb-4 pt-4">
      <div className="mb-2 flex flex-col items-center gap-y-3">
        <Icon className="text-icon-default" name={isXcm ? 'crossChainConfirm' : 'transferConfirm'} size={60} />

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
        initiator={[confirmStore.account]}
        signatory={confirmStore.signatory}
        proxied={confirmStore.proxiedAccount}
      >
        {isXcm && (
          <DetailRow label={t('operation.details.destinationChain')}>
            <ChainTitle
              className="px-2"
              fontClass="text-text-primary text-footnote"
              chainId={confirmStore.xcmChain.chainId}
            />
          </DetailRow>
        )}

        <DetailRow label={t('operation.details.recipient')} className="text-text-secondary">
          <Account accountId={toAccountId(confirmStore.destination)} chain={confirmStore.chain} variant="short" />
        </DetailRow>

        <hr className="w-full border-filter-border pr-2" />

        {accountUtils.isMultisigAccount(confirmStore.account) && (
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
          label={<FootnoteText className="text-text-tertiary">{t('operation.networkFee')}</FootnoteText>}
          className="text-text-primary"
          testId={TEST_IDS.OPERATIONS.CONFIRM_NETWORK_FEE}
        >
          <div className="flex flex-col items-end gap-y-0.5">
            <AssetBalance value={confirmStore.fee} asset={confirmStore.chain.assets[0]} />
            <AssetFiatBalance asset={confirmStore.chain.assets[0]} amount={confirmStore.fee} />
          </div>
        </DetailRow>

        {isXcm && (
          <DetailRow
            label={<FootnoteText className="text-text-tertiary">{t('operation.xcmFee')}</FootnoteText>}
            className="text-text-primary"
          >
            <div className="flex flex-col items-end gap-y-0.5">
              <AssetBalance value={confirmStore.xcmFee} asset={confirmStore.xcmChain.assets[0]} />
              <AssetFiatBalance asset={confirmStore.xcmChain.assets[0]} amount={confirmStore.xcmFee} />
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
          {secondaryActionButton}
          {!hideSignButton && !isMultisigExists && (
            <SignButton
              isDefault={Boolean(secondaryActionButton)}
              type={(signerWallet || initiatorWallet).type}
              onClick={confirmModel.events.confirmed}
            />
          )}
        </div>
      </div>
    </div>
  );
};

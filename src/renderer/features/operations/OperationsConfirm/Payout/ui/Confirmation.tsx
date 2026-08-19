import { useStoreMap, useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { getNativeAsset } from '@/shared/lib/utils';
import { Button, DetailRow, FootnoteText, Icon, SmallTitleText } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { Tooltip } from '@/shared/ui-kit';
import { SignButton } from '@/entities/operations';
import { accountUtils, walletModel } from '@/entities/wallet';
import { AssetFiatBalance } from '@/widgets/price';
import { FeeWithLabel } from '@/widgets/transaction-fee';
import { MultisigExistsAlert } from '../../common/MultisigExistsAlert';
import { MultisigOperationDescriptionField } from '../../common/MultisigOperationDescriptionField';
import { SigningPathConfirmSection } from '../../common/SigningPathConfirmSection';
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

  const isMultisigExists = useUnit(confirmModel.$isMultisigExists);

  if (!confirmStore) {
    return null;
  }

  const { chain, initiator, signatory, multisigDeposit, fee, signingPath, payoutCount, eraCount, validatorCount } =
    confirmStore.meta;
  const nativeAsset = getNativeAsset(chain.assets);

  const hasMultisigAccount = confirmStore.meta.route.some(accountUtils.isAnyMultisigAccount) ?? null;

  return (
    <div className="flex flex-col items-center gap-y-4 px-5 pt-4 pb-4">
      <div className="mb-2 flex flex-col items-center gap-y-3">
        <Icon className="text-icon-default" name="redeemConfirm" size={60} />

        {/* No amount headline: the runtime settles what a page owes at
            execution, so the only honest thing a claim can state up front is
            what it will settle — see `PayoutConfirm`. */}
        <div className="flex flex-col items-center gap-y-1">
          <SmallTitleText>{t('staking.payout.confirmTitle')}</SmallTitleText>
          <FootnoteText className="text-text-tertiary">
            {[
              t('staking.payout.payoutCount', { count: payoutCount }),
              t('staking.payout.eraCount', { count: eraCount }),
              t('staking.payout.validatorCount', { count: validatorCount }),
            ].join(' · ')}
          </FootnoteText>
        </div>
      </div>

      <MultisigExistsAlert active={isMultisigExists} />

      <SigningPathConfirmSection
        signingPath={signingPath}
        chain={chain}
        wallets={wallets}
        initiators={[initiator]}
        signatory={signatory}
        resultTx={confirmStore.meta.tx}
        coreTx={confirmStore.meta.coreTx}
      >
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
              <AssetBalance value={multisigDeposit} asset={nativeAsset} />
              <AssetFiatBalance asset={nativeAsset} amount={multisigDeposit} />
            </div>
          </DetailRow>
        )}

        <FeeWithLabel fee={fee} asset={nativeAsset} label={t('staking.networkFee', { count: 1 })} />
      </SigningPathConfirmSection>

      <MultisigOperationDescriptionField />

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
  );
};

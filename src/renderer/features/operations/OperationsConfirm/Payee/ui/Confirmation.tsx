import { useStoreMap, useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { getNativeAsset, toAccountId } from '@/shared/lib/utils';
import { Button, DetailRow, FootnoteText, Icon } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { Tooltip } from '@/shared/ui-kit';
import { SignButton } from '@/entities/operations';
import { accountUtils, walletModel } from '@/entities/wallet';
import { NamedAccount } from '@/widgets/NameResolver';
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

export const Confirmation = ({ id = 0, onGoBack, secondaryActionButton, hideSignButton }: Props) => {
  const { t } = useI18n();
  const wallets = useUnit(walletModel.$wallets);

  const confirms = useUnit(confirmModel.$confirms);
  const confirm = useStoreMap({
    store: confirmModel.$confirmMap,
    keys: [id],
    fn: (value, [id]) => value[id],
  });

  const isMultisigExists = useUnit(confirmModel.$isMultisigExists);

  if (!confirm) {
    return null;
  }

  const { destination, chain, signatory, multisigDeposit, fee, totalFee, signingPath } = confirm.meta;
  const nativeAsset = getNativeAsset(chain.assets);
  const hasMultisigAccount = confirm.meta.route.some(accountUtils.isAnyMultisigAccount);

  const initiators = confirms.map((confirm) => confirm.meta.initiator);

  return (
    <div className="flex w-full flex-col items-center gap-y-4 px-5 pt-4 pb-4">
      <div className="mb-2 flex flex-col items-center gap-y-3">
        <Icon className="text-icon-default" name="destinationConfirm" size={60} />
      </div>

      <MultisigExistsAlert active={isMultisigExists} />

      <SigningPathConfirmSection
        signingPath={signingPath}
        chain={chain}
        wallets={wallets}
        initiators={initiators}
        signatory={signatory}
        resultTx={confirm.meta.tx}
        coreTx={confirm.meta.coreTx}
      >
        <DetailRow label={t('staking.confirmation.rewardsDestinationLabel')}>
          {destination ? (
            <NamedAccount accountId={toAccountId(destination)} chain={chain} variant="short" />
          ) : (
            <FootnoteText>{t('staking.confirmation.restakeRewards')}</FootnoteText>
          )}
        </DetailRow>

        <hr className="w-full border-filter-border pr-2" />

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

        {totalFee !== fee && <FeeWithLabel fee={totalFee} asset={nativeAsset} label={t('staking.networkFeeTotal')} />}
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
              type={confirm.wallets.signatory.type}
              onClick={confirmModel.startSigning}
            />
          )}
        </div>
      </div>
    </div>
  );
};

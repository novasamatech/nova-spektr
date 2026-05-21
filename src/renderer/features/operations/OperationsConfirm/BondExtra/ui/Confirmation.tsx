import { useStoreMap, useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { formatAmount, getNativeAsset } from '@/shared/lib/utils';
import { Button, DetailRow, FootnoteText, Icon } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { Tooltip } from '@/shared/ui-kit';
import { SignButton } from '@/entities/operations';
import { StakingPopover } from '@/entities/staking';
import { accountUtils, walletModel } from '@/entities/wallet';
import { AssetFiatBalance } from '@/widgets/price';
import { type Config } from '../../../OperationsValidation';
import { MultisigExistsAlert } from '../../common/MultisigExistsAlert';
import { MultisigOperationDescriptionField } from '../../common/MultisigOperationDescriptionField';
import { SigningPathConfirmSection } from '../../common/SigningPathConfirmSection';
import { confirmModel } from '../model/confirm-model';

type Props = {
  id?: number;
  secondaryActionButton?: ReactNode;
  hideSignButton?: boolean;
  onGoBack?: () => void;
  config?: Config;
};

export const Confirmation = ({
  id = 0,
  secondaryActionButton,
  hideSignButton,
  config = { withFormatAmount: true },
  onGoBack,
}: Props) => {
  const { t } = useI18n();
  const wallets = useUnit(walletModel.$wallets);

  const confirms = useUnit(confirmModel.$confirms);
  const confirm = useStoreMap({
    store: confirmModel.$confirmStore,
    keys: [id],
    fn: (value, [id]) => value[id],
  });

  const isMultisigExists = useUnit(confirmModel.$isMultisigExists);

  if (!confirm || !confirm.wallets.initiator) {
    return null;
  }

  const { amount, asset, chain, fee, totalFee, signatory, route, multisigDeposit, signingPath } = confirm.meta;
  const nativeAsset = getNativeAsset(chain.assets);

  const hasMultisigAccount = route.some(accountUtils.isAnyMultisigAccount);

  const amountValue = config.withFormatAmount ? formatAmount(amount, asset.precision) : amount;

  const initiators = confirms.map((confirm) => confirm.meta.initiator);

  return (
    <div className="flex w-full flex-col items-center gap-y-4 px-5 pt-4 pb-4">
      <div className="mb-2 flex flex-col items-center gap-y-3">
        <Icon className="text-icon-default" name="stakeMoreConfirm" size={60} />

        <div className="flex flex-col items-center gap-y-1">
          <AssetBalance
            value={amountValue}
            asset={asset}
            className="font-manrope text-[32px] leading-[36px] font-bold text-text-primary"
          />
          <AssetFiatBalance asset={asset} amount={amountValue} className="text-headline" />
        </div>
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

        <DetailRow
          className="text-text-primary"
          label={<FootnoteText className="text-text-tertiary">{t('staking.networkFee', { count: 1 })}</FootnoteText>}
        >
          <div className="flex flex-col items-end gap-y-0.5">
            <AssetBalance value={fee} asset={nativeAsset} />
            <AssetFiatBalance asset={nativeAsset} amount={fee} />
          </div>
        </DetailRow>

        {confirms.length > 1 && (
          <DetailRow
            className="text-text-primary"
            label={<FootnoteText className="text-text-tertiary">{t('staking.networkFeeTotal')}</FootnoteText>}
          >
            <div className="flex flex-col items-end gap-y-0.5">
              <AssetBalance value={totalFee} asset={nativeAsset} />
              <AssetFiatBalance asset={nativeAsset} amount={totalFee} />
            </div>
          </DetailRow>
        )}

        <StakingPopover labelText={t('staking.confirmation.hintTitle')}>
          <StakingPopover.Item>{t('staking.confirmation.hintNewRewards')}</StakingPopover.Item>
        </StakingPopover>
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
              type={confirm.wallets.signatory?.type}
              onClick={confirmModel.startSigning}
            />
          )}
        </div>
      </div>
    </div>
  );
};

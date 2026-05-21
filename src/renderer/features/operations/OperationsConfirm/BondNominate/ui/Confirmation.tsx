import { useStoreMap, useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { formatAmount, getNativeAsset, toAccountId } from '@/shared/lib/utils';
import { Button, CaptionText, DetailRow, Duration, FootnoteText, Icon } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { Tooltip } from '@/shared/ui-kit';
import { identity } from '@/domains/network';
import { stakingService } from '@/domains/staking';
import { SignButton } from '@/entities/operations';
import { SelectedValidatorsModal, StakingPopover, UnstakingDuration } from '@/entities/staking';
import { accountUtils, walletModel } from '@/entities/wallet';
import { NamedAccount } from '@/widgets/NameResolver';
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
  config?: Config;

  onGoBack?: () => void;
};

export const Confirmation = ({
  id = 0,
  secondaryActionButton,
  hideSignButton,
  onGoBack,
  config = { withFormatAmount: true },
}: Props) => {
  const { t } = useI18n();
  const wallets = useUnit(walletModel.$wallets);
  const confirms = useUnit(confirmModel.$confirms);
  const confirm = useStoreMap({
    store: confirmModel.$confirmMap,
    keys: [id],
    fn: (value, [id]) => value[id],
  });

  const initiatorWallet = confirm?.wallets.initiator;

  const signerWallet = confirm?.wallets.signatory;

  const api = useStoreMap({
    store: confirmModel.$apis,
    keys: [confirm?.meta.chain?.chainId],
    fn: (value, [chainId]) => (chainId ? value?.[chainId] : undefined),
  });

  const timelineApi = useStoreMap({
    store: confirmModel.$apis,
    keys: [confirm?.meta.chain?.additional?.timelineChain ?? confirm?.meta.chain?.chainId],
    fn: (value, [chainId]) => (chainId ? value?.[chainId] : undefined),
  });

  const { getEraDurationSeconds } = stakingService;
  const eraDurationSeconds =
    api && timelineApi && confirm?.meta.chain ? getEraDurationSeconds(api, timelineApi, confirm.meta.chain) : undefined;

  const identities = useStoreMap({
    store: identity.$list,
    keys: [confirm?.meta.chain?.chainId],
    fn: (value, [chainId]) => (chainId ? (value[chainId] ?? {}) : {}),
  });

  const isMultisigExists = useUnit(confirmModel.$isMultisigExists);

  const [isValidatorsOpen, toggleValidators] = useToggle();

  if (!confirm || !initiatorWallet) {
    return null;
  }

  const amountValue = config.withFormatAmount
    ? formatAmount(confirm.meta.amount, confirm.meta.asset.precision)
    : confirm.meta.amount;

  const hasMultisig = confirm.meta.route.some(accountUtils.isAnyMultisigAccount);

  const nativeAsset = getNativeAsset(confirm.meta.chain.assets);

  const { signingPath } = confirm.meta;

  const initiators = confirms.map((confirm) => confirm.meta.initiator);

  return (
    <>
      <div className="flex w-full flex-col items-center gap-y-4 px-5 pt-4 pb-4">
        <div className="mb-2 flex flex-col items-center gap-y-3">
          <Icon className="text-icon-default" name="startStakingConfirm" size={60} />

          <div className="flex flex-col items-center gap-y-1">
            <AssetBalance
              value={amountValue}
              asset={confirm.meta.asset}
              className="font-manrope text-[32px] leading-[36px] font-bold text-text-primary"
            />
            <AssetFiatBalance asset={confirm.meta.asset} amount={amountValue} className="text-headline" />
          </div>
        </div>

        <MultisigExistsAlert active={isMultisigExists} />

        <SigningPathConfirmSection
          signingPath={signingPath}
          chain={confirm.meta.chain}
          wallets={wallets}
          initiators={initiators}
          signatory={confirm.meta.signatory}
        >
          <DetailRow label={t('staking.confirmation.validatorsLabel')}>
            <button
              type="button"
              className="group flex items-center gap-x-1 rounded-sm px-2 py-1 hover:bg-action-background-hover"
              onClick={toggleValidators}
            >
              <div className="rounded-[30px] bg-icon-accent px-1.5 py-px">
                <CaptionText className="text-white">{confirm.meta.validators.length}</CaptionText>
              </div>
              <Icon className="group-hover:text-icon-hover" name="info" size={16} />
            </button>
          </DetailRow>

          <hr className="w-full border-filter-border pr-2" />

          <DetailRow label={t('staking.confirmation.rewardsDestinationLabel')}>
            {confirm.meta.destination ? (
              <NamedAccount
                accountId={toAccountId(confirm.meta.destination)}
                chain={confirm.meta.chain}
                variant="short"
              />
            ) : (
              <FootnoteText>{t('staking.confirmation.restakeRewards')}</FootnoteText>
            )}
          </DetailRow>

          <hr className="w-full border-filter-border pr-2" />

          {hasMultisig && (
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
                <AssetBalance value={confirm.meta.multisigDeposit} asset={nativeAsset} />
                <AssetFiatBalance asset={nativeAsset} amount={confirm.meta.multisigDeposit} />
              </div>
            </DetailRow>
          )}

          <DetailRow
            className="text-text-primary"
            label={
              <FootnoteText className="text-text-tertiary">
                {t('staking.networkFee', { count: confirms.length || 1 })}
              </FootnoteText>
            }
          >
            <div className="flex flex-col items-end gap-y-0.5">
              <AssetBalance value={confirm.meta.fee} asset={nativeAsset} />
              <AssetFiatBalance asset={nativeAsset} amount={confirm.meta.fee} />
            </div>
          </DetailRow>

          {confirms.length > 1 && (
            <DetailRow
              className="text-text-primary"
              label={<FootnoteText className="text-text-tertiary">{t('staking.networkFeeTotal')}</FootnoteText>}
            >
              <div className="flex flex-col items-end gap-y-0.5">
                <AssetBalance value={confirm.meta.totalFee} asset={nativeAsset} />
                <AssetFiatBalance asset={nativeAsset} amount={confirm.meta.totalFee} />
              </div>
            </DetailRow>
          )}

          <StakingPopover labelText={t('staking.confirmation.hintTitleStartStaking')}>
            <StakingPopover.Item>
              {t('staking.confirmation.hintRewards')}
              {' ('}
              <Duration seconds={eraDurationSeconds ?? 0} />
              {')'}
            </StakingPopover.Item>
            <StakingPopover.Item>
              {t('staking.confirmation.hintUnstakePeriod')} {'('}
              <UnstakingDuration api={api} timelineApi={timelineApi} />
              {')'}
            </StakingPopover.Item>
            <StakingPopover.Item>{t('staking.confirmation.hintNoRewards')}</StakingPopover.Item>
            <StakingPopover.Item>{t('staking.confirmation.hintWithdraw')}</StakingPopover.Item>
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
                type={(signerWallet || initiatorWallet).type}
                onClick={confirmModel.startSigning}
              />
            )}
          </div>
        </div>
      </div>

      <SelectedValidatorsModal
        isOpen={isValidatorsOpen}
        validators={confirm.meta.validators}
        identities={identities}
        onClose={toggleValidators}
      />
    </>
  );
};

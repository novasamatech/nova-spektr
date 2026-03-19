import { useStoreMap, useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { Button, DetailRow, FootnoteText, Icon } from '@/shared/ui';
import { AssetBalance, TransactionDetails } from '@/shared/ui-entities';
import { Tooltip } from '@/shared/ui-kit';
import { SignButton } from '@/entities/operations';
import { StakingPopover, UnstakingDuration } from '@/entities/staking';
import { accountUtils, walletModel } from '@/entities/wallet';
import { AssetFiatBalance } from '@/widgets/price';
import { Fee, FeeWithLabel } from '@/widgets/transaction-fee';
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
  const confirms = useUnit(confirmModel.$confirms);

  const confirmStore = useStoreMap({
    store: confirmModel.$confirmStore,
    keys: [id],
    fn: (value, [id]) => value?.[id],
  });

  const isMultisigExists = useUnit(confirmModel.$isMultisigExists);

  const timelineApi = useStoreMap({
    store: confirmModel.$apis,
    keys: [confirmStore?.meta.chain.additional?.timelineChain ?? confirmStore?.meta.chain.chainId],
    fn: (value, [chainId]) => (chainId ? value?.[chainId] : undefined),
  });

  if (!confirmStore) {
    return null;
  }

  const { amount, asset, chain, totalFee, fee, signatory, route, multisigDeposit, api } = confirmStore.meta;

  const hasMultisigAccount = route.some(accountUtils.isAnyMultisigAccount);

  return (
    <div className="flex flex-col items-center gap-y-4 px-5 pt-4 pb-4">
      <div className="mb-2 flex flex-col items-center gap-y-3">
        <Icon className="text-icon-default" name="unstakeConfirm" size={60} />

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

      <TransactionDetails
        chain={chain}
        wallets={wallets}
        initiators={confirms.map((c) => c.meta.initiator)}
        signatory={signatory}
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
            <Fee fee={multisigDeposit} asset={asset} />
          </DetailRow>
        )}

        <FeeWithLabel fee={fee} asset={asset} label={t('staking.networkFee', { count: confirms.length || 1 })} />

        {confirms.length > 1 && <FeeWithLabel fee={totalFee} asset={asset} label={t('staking.networkFeeTotal')} />}

        <StakingPopover labelText={t('staking.confirmation.hintTitle')}>
          <StakingPopover.Item>
            {t('staking.confirmation.hintUnstakePeriod')} {' ('}
            <UnstakingDuration api={api} timelineApi={timelineApi} />
            {')'}
          </StakingPopover.Item>
          <StakingPopover.Item>{t('staking.confirmation.hintNoRewards')}</StakingPopover.Item>
          <StakingPopover.Item>{t('staking.confirmation.hintWithdraw')}</StakingPopover.Item>
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
              type={confirmStore.wallets.signatory.type}
              onClick={confirmModel.startSigning}
            />
          )}
        </div>
      </div>
    </div>
  );
};

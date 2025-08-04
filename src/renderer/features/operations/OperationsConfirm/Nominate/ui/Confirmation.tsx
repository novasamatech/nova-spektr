import { useStoreMap, useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { Button, CaptionText, DetailRow, FootnoteText, Icon } from '@/shared/ui';
import { TransactionDetails } from '@/shared/ui-entities';
import { Tooltip } from '@/shared/ui-kit';
import { identity } from '@/domains/network';
import { SignButton } from '@/entities/operations';
import { SelectedValidatorsModal, StakingPopover } from '@/entities/staking';
import { Fee, FeeWithLabel } from '@/entities/transaction';
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
  const confirms = useUnit(confirmModel.$confirms);

  const confirmStore = useStoreMap({
    store: confirmModel.$confirmStore,
    keys: [id],
    fn: (value, [id]) => value?.[id],
  });

  const identities = useStoreMap({
    store: identity.$list,
    keys: [confirmStore?.meta?.chain?.chainId],
    fn: (value, [chainId]) => value[chainId] ?? {},
  });

  const isMultisigExists = useUnit(confirmModel.$isMultisigExists);

  const [isValidatorsOpen, toggleValidators] = useToggle();

  if (!confirmStore) {
    return null;
  }

  const { chain, asset, route, validators, signatory, fee, totalFee, multisigDeposit } = confirmStore.meta;

  const multisigAccount = route.find(accountUtils.isMultisigAccount);

  return (
    <>
      <div className="w-modal flex flex-col items-center gap-y-4 px-5 pt-4 pb-4">
        <div className="mb-2 flex flex-col items-center gap-y-3">
          <Icon className="text-icon-default" name="changeValidatorsConfirm" size={60} />
        </div>

        <MultisigExistsAlert active={isMultisigExists} />

        <TransactionDetails
          chain={chain}
          wallets={wallets}
          initiators={confirms.map((c) => c.meta.initiator)}
          signatory={signatory}
        >
          <DetailRow label={t('staking.confirmation.validatorsLabel')}>
            <button
              type="button"
              className="group hover:bg-action-background-hover flex items-center gap-x-1 rounded-sm px-2 py-1"
              onClick={toggleValidators}
            >
              <div className="bg-icon-accent rounded-[30px] px-1.5 py-px">
                <CaptionText className="text-white">{validators.length}</CaptionText>
              </div>
              <Icon className="group-hover:text-icon-hover" name="info" size={16} />
            </button>
          </DetailRow>

          <hr className="border-filter-border w-full pr-2" />

          {multisigAccount && (
            <DetailRow
              className="text-text-primary"
              label={
                <>
                  <Icon className="text-text-tertiary" name="lock" size={12} />
                  <FootnoteText className="text-text-tertiary">{t('staking.multisigDepositLabel')}</FootnoteText>
                  <Tooltip>
                    <Tooltip.Trigger>
                      <div tabIndex={0}>
                        <Icon name="info" className="hover:text-icon-hover cursor-pointer" size={16} />
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
            <StakingPopover.Item>{t('staking.confirmation.hintNewValidators')}</StakingPopover.Item>
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
                type={confirmStore.wallets.signatory?.type}
                onClick={confirmModel.startSigning}
              />
            )}
          </div>
        </div>
      </div>

      <SelectedValidatorsModal
        isOpen={isValidatorsOpen}
        validators={validators}
        identities={identities}
        onClose={toggleValidators}
      />
    </>
  );
};

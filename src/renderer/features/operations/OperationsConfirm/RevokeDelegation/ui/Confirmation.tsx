import { BN } from '@polkadot/util';
import { useGate, useStoreMap, useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { formatAmount, getNativeAsset, toAccountId } from '@/shared/lib/utils';
import { Button, DetailRow, FootnoteText, Icon, LargeTitleText, Loader } from '@/shared/ui';
import { AssetBalance, TransactionDetails } from '@/shared/ui-entities';
import { Box, Tooltip } from '@/shared/ui-kit';
import { BalanceDiff, LockPeriodDiff, LockValueDiff, TracksDetails } from '@/entities/governance';
import { SignButton } from '@/entities/operations';
import { accountUtils, walletModel } from '@/entities/wallet';
import { getLocksForAccount, lockPeriodsModel, locksAggregate, locksPeriodsAggregate } from '@/features/governance';
import { NamedAccount } from '@/widgets/NameResolver';
import { AssetFiatBalance } from '@/widgets/price';
import { type Config } from '../../../OperationsValidation';
import { MultisigExistsAlert } from '../../common/MultisigExistsAlert';
import { MultisigOperationDescriptionField } from '../../common/MultisigOperationDescriptionField';
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

  const confirmStore = useStoreMap({
    store: confirmModel.$confirmStore,
    keys: [id],
    fn: (value, [id]) => (value ? value[id] : null) ?? null,
  });

  const lockPeriods = useStoreMap({
    store: lockPeriodsModel.$lockPeriods,
    keys: [confirmStore?.meta.chain],
    fn: (locks, [chain]) => (chain ? (locks[chain.chainId] ?? null) : null),
  });

  useGate(locksPeriodsAggregate.gates.flow, { chain: confirmStore?.meta.chain });
  useGate(locksAggregate.gates.flow, { chain: confirmStore?.meta.chain });

  const trackLocks = useUnit(locksAggregate.$trackLocks);
  const isMultisigExists = useUnit(confirmModel.$isMultisigExists);

  const initiators = confirms.map((confirm) => confirm.meta.initiator);

  if (!confirmStore) {
    return (
      <Box width="440px" height="430px" verticalAlign="center" horizontalAlign="center">
        <Loader color="primary" />
      </Box>
    );
  }

  const nativeAsset = getNativeAsset(confirmStore.meta.chain.assets);
  const signerWallet = confirmStore.wallets.signatory;

  const amountValue = config.withFormatAmount
    ? formatAmount(confirmStore.meta.balance, confirmStore.meta.asset.precision)
    : confirmStore.meta.balance;

  const locksForAddress = getLocksForAccount(confirmStore.meta.initiator.accountId, trackLocks);

  return (
    <div className="flex w-modal flex-col items-center gap-y-4 px-5 py-4">
      <div className="mb-2 flex flex-col items-center gap-y-3">
        <Icon className="text-icon-default" name="revokeDelegationConfirm" size={60} />

        <LargeTitleText as="p" className="font-manrope">
          {'-'}
          <AssetBalance className="text-large-title" value={amountValue} asset={confirmStore.meta.asset} />
        </LargeTitleText>
      </div>

      <MultisigExistsAlert active={isMultisigExists} />

      <TransactionDetails
        chain={confirmStore.meta.chain}
        wallets={wallets}
        initiators={initiators}
        signatory={confirmStore.meta.signatory}
      >
        <DetailRow label={t('governance.addDelegation.confirmation.target')}>
          <NamedAccount
            variant="short"
            chain={confirmStore.meta.chain}
            accountId={toAccountId(confirmStore.meta.delegate)}
          />
        </DetailRow>

        <DetailRow label={t('governance.addDelegation.confirmation.tracks')}>
          <TracksDetails tracks={confirmStore.meta.tracks} />
        </DetailRow>

        <hr className="w-full border-filter-border pr-2" />

        <DetailRow label={t('governance.operations.transferable')} wrapperClassName="items-start">
          <BalanceDiff
            from={confirmStore.meta.transferable}
            to={new BN(confirmStore.meta.transferable).add(new BN(amountValue))}
            asset={confirmStore.meta.asset}
            lock={locksForAddress}
          />
        </DetailRow>

        <DetailRow label={t('governance.locks.governanceLock')} wrapperClassName="items-start">
          <LockValueDiff from={locksForAddress} to="0" asset={confirmStore.meta.asset} />
        </DetailRow>

        <DetailRow label={t('governance.locks.undelegatePeriod')} wrapperClassName="items-start">
          <LockPeriodDiff unlock from={confirmStore.meta.conviction} to="None" lockPeriods={lockPeriods} />
        </DetailRow>

        <hr className="w-full border-filter-border pr-2" />

        {accountUtils.isAnyMultisigAccount(confirmStore.meta.initiator) && (
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
          className="text-text-primary"
          label={<FootnoteText className="text-text-tertiary">{t('staking.networkFee', { count: 1 })}</FootnoteText>}
        >
          <div className="flex flex-col items-end gap-y-0.5">
            <AssetBalance value={confirmStore.meta.fee} asset={nativeAsset} />
            <AssetFiatBalance asset={nativeAsset} amount={confirmStore.meta.fee} />
          </div>
        </DetailRow>
      </TransactionDetails>

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
              type={signerWallet.type}
              onClick={confirmModel.startSigning}
            />
          )}
        </div>
      </div>
    </div>
  );
};

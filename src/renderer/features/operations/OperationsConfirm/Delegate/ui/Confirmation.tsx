import { BN } from '@polkadot/util';
import { useGate, useStoreMap, useUnit } from 'effector-react';
import { type ReactNode, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { formatAmount, getNativeAsset, nullable, toAccountId } from '@/shared/lib/utils';
import { Button, DetailRow, FootnoteText, Icon, LargeTitleText, Loader } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { Box, Tooltip } from '@/shared/ui-kit';
import { BalanceDiff, LockPeriodDiff, LockValueDiff, TracksDetails } from '@/entities/governance';
import { SignButton } from '@/entities/operations';
import { accountUtils, walletModel } from '@/entities/wallet';
import { lockPeriodsModel, locksPeriodsAggregate } from '@/features/governance';
import { NamedAccount } from '@/widgets/NameResolver';
import { AssetFiatBalance } from '@/widgets/price';
import { FeeWithLabel } from '@/widgets/transaction-fee';
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
    store: confirmModel.$confirmStore,
    keys: [id],
    fn: (value, [id]) => value[id],
  });

  const lockPeriods = useStoreMap({
    store: lockPeriodsModel.$lockPeriods,
    keys: [confirm?.meta?.chain],
    fn: (locks, [chain]) => (chain ? (locks[chain.chainId] ?? null) : null),
  });

  useGate(locksPeriodsAggregate.gates.flow, { chain: confirm?.meta?.chain });

  const isMultisigExists = useUnit(confirmModel.$isMultisigExists);

  const initiators = useMemo(() => {
    if (nullable(confirms)) return [];

    return confirms.map((confirm) => confirm.meta.initiator);
  }, [confirms]);

  const hasMultisig = useMemo(() => {
    if (nullable(confirm)) return null;

    return confirm.meta.route.some(accountUtils.isAnyMultisigAccount);
  }, [confirm?.meta?.route]);

  if (!confirm || !confirm.wallets?.initiator) {
    return (
      <Box width="440px" height="440px" verticalAlign="center" horizontalAlign="center">
        <Loader color="primary" />
      </Box>
    );
  }

  const { meta, wallets: confirmWallets } = confirm;
  const nativeAsset = getNativeAsset(meta.chain.assets);

  const amountValue = config.withFormatAmount ? formatAmount(meta.balance, meta.asset.precision) : meta.balance;

  return (
    <div className="flex w-full flex-col items-center gap-y-4 px-5 py-4">
      <div className="mb-2 flex flex-col items-center gap-y-3">
        <Icon className="text-icon-default" name="addDelegationConfirm" size={60} />

        <LargeTitleText as="p" className="font-manrope">
          <AssetBalance className="text-large-title" value={amountValue} asset={meta.asset} />
        </LargeTitleText>
      </div>

      <MultisigExistsAlert active={isMultisigExists} />

      <SigningPathConfirmSection
        signingPath={meta.signingPath}
        chain={meta.chain}
        wallets={wallets}
        initiators={initiators}
        signatory={meta.signatory}
      >
        <DetailRow label={t('governance.addDelegation.confirmation.target')}>
          <NamedAccount variant="short" chain={meta.chain} accountId={toAccountId(meta.target)} />
        </DetailRow>

        <DetailRow label={t('governance.addDelegation.confirmation.tracks')}>
          <TracksDetails tracks={meta.tracks} />
        </DetailRow>

        <hr className="w-full border-filter-border pr-2" />

        <DetailRow label={t('governance.operations.transferable')} wrapperClassName="items-start">
          <BalanceDiff
            from={meta.transferable}
            to={new BN(meta.transferable).sub(new BN(amountValue))}
            asset={meta.asset}
            lock={meta.locks}
          />
        </DetailRow>

        <DetailRow label={t('governance.locks.governanceLock')} wrapperClassName="items-start">
          <LockValueDiff from={meta.locks} to={amountValue} asset={meta.asset} />
        </DetailRow>

        <DetailRow label={t('governance.locks.undelegatePeriod')} wrapperClassName="items-start">
          <LockPeriodDiff from="None" to={meta.conviction} lockPeriods={lockPeriods} />
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
              <AssetBalance value={meta.multisigDeposit} asset={nativeAsset} />
              <AssetFiatBalance asset={nativeAsset} amount={meta.multisigDeposit} />
            </div>
          </DetailRow>
        )}

        <FeeWithLabel fee={meta.fee} asset={meta.asset} label={t('staking.networkFee', { count: confirms.length })} />

        {confirms.length > 1 && (
          <FeeWithLabel
            fee={meta.totalFee}
            asset={meta.asset}
            label={t('staking.networkFeeTotal')}
            className="text-text-primary"
          />
        )}
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
              type={confirmWallets.signatory?.type}
              onClick={confirmModel.startSigning}
            />
          )}
        </div>
      </div>
    </div>
  );
};

import { BN } from '@polkadot/util';
import { useForm } from 'effector-forms';
import { useGate, useStoreMap, useUnit } from 'effector-react';
import { type FormEvent } from 'react';

import { useI18n } from '@/shared/i18n';
import { formatAmount, formatBalance } from '@/shared/lib/utils';
import { BaseModal, Button, DetailRow, FootnoteText, Icon, InputHint, SmallTitleText, Tooltip } from '@/shared/ui';
import { AssetBalance } from '@/entities/asset';
import { OperationTitle } from '@/entities/chain';
import { BalanceDiff, LockPeriodDiff, LockValueDiff } from '@/entities/governance';
import { SignatorySelector } from '@/entities/operations';
import { AssetFiatBalance, priceProviderModel } from '@/entities/price';
import { FeeLoader } from '@/entities/transaction';
import { ProxyWalletAlert } from '@/entities/wallet';
import { AmountInput } from '@/features/assets-balances';
import { lockPeriodsModel, locksPeriodsAggregate } from '@/features/governance';
import { ConvictionSelect } from '@/widgets/VoteModal';
import { formModel } from '../model/form-model';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onGoBack: () => void;
};

export const DelegateForm = ({ isOpen, onClose, onGoBack }: Props) => {
  const { t } = useI18n();
  const { submit } = useForm(formModel.$delegateForm);
  const network = useUnit(formModel.$networkStore);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <BaseModal
      closeButton
      headerClass="px-5 py-3"
      panelClass="flex h-[736px] w-modal flex-col gap-4 bg-white "
      contentClass="min-h-0 w-full flex flex-col flex-1 bg-card-background py-4 rounded-lg overflow-y-auto"
      isOpen={isOpen}
      title={
        network?.chain && <OperationTitle title={t('governance.addDelegation.title')} chainId={network.chain.chainId} />
      }
      onClose={onClose}
    >
      <div className="flex w-full flex-1 flex-col px-5">
        <SmallTitleText>{t('governance.addDelegation.formTitle')}</SmallTitleText>

        <form id="transfer-form" className="mt-4 flex flex-col gap-y-4" onSubmit={submitForm}>
          <ProxyFeeAlert />
          <Signatories />
          <Amount />
          <Conviction />
        </form>

        <div className="flex flex-1 flex-col justify-end gap-y-6 pb-4 pt-6">
          <FeeSection />
        </div>

        <ActionsSection onGoBack={onGoBack} />
      </div>
    </BaseModal>
  );
};

const ProxyFeeAlert = () => {
  const {
    fields: { shards },
  } = useForm(formModel.$delegateForm);

  const feeData = useUnit(formModel.$feeData);
  const balance = useUnit(formModel.$proxyBalance);
  const network = useUnit(formModel.$networkStore);
  const proxyWallet = useUnit(formModel.$proxyWallet);

  if (!network || !proxyWallet || !shards.hasError()) {
    return null;
  }

  const formattedFee = formatBalance(feeData.fee, network.asset.precision).value;
  const formattedBalance = formatBalance(balance, network.asset.precision).value;

  return (
    <ProxyWalletAlert
      wallet={proxyWallet}
      fee={formattedFee}
      balance={formattedBalance}
      symbol={network.asset.symbol}
      onClose={shards.resetErrors}
    />
  );
};

const Signatories = () => {
  const { t } = useI18n();

  const {
    fields: { signatory },
  } = useForm(formModel.$delegateForm);

  const signatories = useUnit(formModel.$signatories);
  const network = useUnit(formModel.$networkStore);
  const isMultisig = useUnit(formModel.$isMultisig);

  if (!isMultisig || !network) {
    return null;
  }

  return (
    <SignatorySelector
      signatory={signatory.value}
      signatories={signatories[0]}
      asset={network.chain.assets[0]}
      addressPrefix={network.chain.addressPrefix}
      hasError={signatory.hasError()}
      errorText={t(signatory.errorText())}
      onChange={signatory.onChange}
    />
  );
};

const Conviction = () => {
  const {
    fields: { conviction, amount },
  } = useForm(formModel.$delegateForm);
  const network = useUnit(formModel.$networkStore);

  if (!network) {
    return null;
  }

  return (
    <ConvictionSelect
      value={conviction.value}
      asset={network.asset}
      amount={new BN(formatAmount(amount.value, network.asset.precision))}
      onChange={conviction.onChange}
    />
  );
};

const Amount = () => {
  const { t } = useI18n();

  const {
    fields: { amount },
  } = useForm(formModel.$delegateForm);

  const network = useUnit(formModel.$networkStore);
  const delegateBalanceRange = useUnit(formModel.$delegateBalanceRange);

  if (!network) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-2">
      <AmountInput
        invalid={amount.hasError()}
        value={amount.value}
        balance={delegateBalanceRange}
        balancePlaceholder={t('general.input.availableLabel')}
        placeholder={t('general.input.amountLabel')}
        asset={network.asset}
        onChange={amount.onChange}
      />
      <InputHint active={amount.hasError()} variant="error">
        {t(amount.errorText())}
      </InputHint>
    </div>
  );
};

const FeeSection = () => {
  const { t } = useI18n();

  const {
    fields: { shards, amount, conviction },
  } = useForm(formModel.$delegateForm);

  const network = useUnit(formModel.$networkStore);
  const feeData = useUnit(formModel.$feeData);
  const isFeeLoading = useUnit(formModel.$isFeeLoading);
  const isMultisig = useUnit(formModel.$isMultisig);
  const accounts = useUnit(formModel.$accounts);

  const lockPeriods = useStoreMap({
    store: lockPeriodsModel.$lockPeriods,
    keys: [network?.chain],
    fn: (locks, [chain]) => (chain ? (locks[chain.chainId] ?? null) : null),
  });

  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

  useGate(locksPeriodsAggregate.gates.flow, { chain: network?.chain });

  if (!network || shards.value.length === 0 || accounts.length === 0) {
    return null;
  }

  const amountValue = new BN(formatAmount(amount.value, network.asset.precision));

  return (
    <div className="flex flex-col gap-y-2">
      {shards.value.length === 1 && (
        <>
          <DetailRow label={t('governance.operations.transferable')} wrapperClassName="items-start">
            <BalanceDiff
              from={accounts[0].balance}
              to={new BN(accounts[0].balance).sub(amountValue)}
              asset={network.asset}
              lock={accounts[0].lock}
            />
          </DetailRow>

          <DetailRow label={t('governance.locks.governanceLock')} wrapperClassName="items-start">
            <LockValueDiff asset={network.asset} from={accounts[0].lock} to={amountValue} />
          </DetailRow>

          <DetailRow label={t('governance.locks.undelegatePeriod')} wrapperClassName="items-start">
            <LockPeriodDiff from="None" to={conviction.value} lockPeriods={lockPeriods} />
          </DetailRow>
        </>
      )}

      {isMultisig && (
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
            <AssetBalance value={feeData.multisigDeposit} asset={network.chain.assets[0]} />
            <AssetFiatBalance asset={network.chain.assets[0]} amount={feeData.multisigDeposit} />
          </div>
        </DetailRow>
      )}

      <DetailRow
        label={
          <FootnoteText className="text-text-tertiary">
            {t('staking.networkFee', { count: shards.value.length || 1 })}
          </FootnoteText>
        }
        className="text-text-primary"
      >
        {isFeeLoading ? (
          <FeeLoader fiatFlag={Boolean(fiatFlag)} />
        ) : (
          <div className="flex flex-col items-end gap-y-0.5">
            <AssetBalance value={feeData.fee} asset={network.chain.assets[0]} />
            <AssetFiatBalance asset={network.chain.assets[0]} amount={feeData.fee} />
          </div>
        )}
      </DetailRow>

      {shards.value.length > 1 && (
        <DetailRow
          label={<FootnoteText className="text-text-tertiary">{t('staking.networkFeeTotal')}</FootnoteText>}
          className="text-text-primary"
        >
          {isFeeLoading ? (
            <FeeLoader fiatFlag={Boolean(fiatFlag)} />
          ) : (
            <div className="flex flex-col items-end gap-y-0.5">
              <AssetBalance value={feeData.totalFee} asset={network.chain.assets[0]} />
              <AssetFiatBalance asset={network.chain.assets[0]} amount={feeData.totalFee} />
            </div>
          )}
        </DetailRow>
      )}
    </div>
  );
};

const ActionsSection = ({ onGoBack }: { onGoBack: () => void }) => {
  const { t } = useI18n();

  const canSubmit = useUnit(formModel.$canSubmit);

  return (
    <div className="mt-4 flex items-center justify-between">
      <Button variant="text" onClick={onGoBack}>
        {t('operation.goBackButton')}
      </Button>
      <Button form="transfer-form" type="submit" disabled={!canSubmit}>
        {t('transfer.continueButton')}
      </Button>
    </div>
  );
};

import { BN } from '@polkadot/util';
import { useGate, useStoreMap, useUnit } from 'effector-react';
import { type FormEvent, useMemo } from 'react';

import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { formatAmount, transferableAmount } from '@/shared/lib/utils';
import { Button, DetailRow, FootnoteText, Icon, InputHint, SmallTitleText } from '@/shared/ui';
import { AssetBalance, SignatorySelect } from '@/shared/ui-entities';
import { Modal, Tooltip } from '@/shared/ui-kit';
import { accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { OperationTitle } from '@/entities/chain';
import { BalanceDiff, LockPeriodDiff, LockValueDiff } from '@/entities/governance';
import { AssetFiatBalance } from '@/entities/price';
import { FeeWithLabel } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
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
  const { submit } = useForm(formModel.form);
  const network = useUnit(formModel.$networkStore);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <Modal isOpen={isOpen} size="md" height="lg" onToggle={onClose}>
      <Modal.Title close>
        {network?.chain && (
          <OperationTitle title={t('operations.modalTitles.editDelegationOn')} chainId={network.chain.chainId} />
        )}
      </Modal.Title>
      <Modal.Content>
        <div className="flex w-full flex-1 flex-col rounded-lg bg-card-background px-5">
          <SmallTitleText>{t('governance.addDelegation.formTitle')}</SmallTitleText>

          <form id="transfer-form" className="mt-4 flex flex-col gap-y-4" onSubmit={submitForm}>
            <Signatories />
            <Amount />
            <Conviction />
          </form>

          <div className="flex flex-1 flex-col justify-end gap-y-6 pt-6">
            <FeeSection />
          </div>
        </div>
      </Modal.Content>
      <Modal.Footer>
        <ActionsSection onGoBack={onGoBack} />
      </Modal.Footer>
    </Modal>
  );
};

const Signatories = () => {
  const { t } = useI18n();

  const {
    fields: { signatory, initiator },
  } = useForm(formModel.form);

  const signatories = useUnit(formModel.$signatories);
  const network = useUnit(formModel.$networkStore);

  const balances = useUnit(balanceModel.$balanceMap);
  const allAccounts = useUnit(accounts.$list);
  const allWallets = useUnit(walletModel.$wallets);

  const signatoriesWithBalance = useMemo(() => {
    if (!network) {
      return [];
    }
    return signatories.map((signatory) => {
      const balance = balanceUtils.getBalance(
        balances,
        signatory.accountId,
        network.chain.chainId,
        network.asset.assetId,
      );
      return { account: signatory, balance: transferableAmount(balance) };
    });
  }, [signatories, balances]);

  if (!network) {
    return null;
  }

  return (
    <SignatorySelect
      signatory={signatory.value}
      signatories={signatoriesWithBalance}
      allAccounts={allAccounts}
      initiator={initiator.value}
      allWallets={allWallets}
      hasError={signatory.hasError}
      errorText={t(signatory.errorMessage)}
      network={network}
      onChange={signatory.onChange}
    />
  );
};

const Conviction = () => {
  const {
    fields: { conviction, isUnchanged },
  } = useForm(formModel.form);
  const network = useUnit(formModel.$networkStore);

  if (!network) {
    return null;
  }

  return <ConvictionSelect conviction={conviction.value} disabled={isUnchanged.value} onChange={conviction.onChange} />;
};

const Amount = () => {
  const { t } = useI18n();

  const {
    fields: { amount, isUnchanged },
  } = useForm(formModel.form);

  const network = useUnit(formModel.$networkStore);
  const delegateBalanceRange = useUnit(formModel.$delegateBalanceRange);

  if (!network) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-2">
      <AmountInput
        invalid={amount.hasError}
        value={amount.value}
        disabled={isUnchanged.value}
        balance={delegateBalanceRange}
        balancePlaceholder={t('general.input.availableLabel')}
        placeholder={t('general.input.amountLabel')}
        asset={network.asset}
        onChange={amount.onChange}
      />
      <InputHint active={amount.hasError} variant="error">
        {t(amount.errorMessage)}
      </InputHint>
    </div>
  );
};

const FeeSection = () => {
  const { t } = useI18n();

  const {
    fields: { initiator, amount, conviction },
  } = useForm(formModel.form);

  const network = useUnit(formModel.$networkStore);
  const fee = useUnit(formModel.$fee);
  const pendingFee = useUnit(formModel.$pendingFee);
  const multisigDeposit = useUnit(formModel.$multisigDeposit);
  const isMultisig = useUnit(formModel.$hasAnyMultisig);
  const availableBalance = useUnit(formModel.$availableBalance);
  const previousConviction = useUnit(formModel.$previousConviction);

  const lockPeriods = useStoreMap({
    store: lockPeriodsModel.$lockPeriods,
    keys: [network?.chain],
    fn: (locks, [chain]) => (chain ? (locks[chain.chainId] ?? null) : null),
  });

  useGate(locksPeriodsAggregate.gates.flow, { chain: network?.chain });

  if (!network || !initiator.value || !availableBalance) {
    return null;
  }

  const amountValue = new BN(formatAmount(amount.value, network.asset.precision));

  return (
    <div className="flex flex-col gap-y-2">
      <DetailRow label={t('governance.operations.transferable')} wrapperClassName="items-start">
        <BalanceDiff
          from={availableBalance.balance}
          to={new BN(availableBalance.balance).sub(amountValue)}
          asset={network.asset}
          lock={availableBalance.lock}
        />
      </DetailRow>

      <DetailRow label={t('governance.locks.governanceLock')} wrapperClassName="items-start">
        <LockValueDiff asset={network.asset} from={availableBalance.lock} to={amountValue} />
      </DetailRow>

      <DetailRow label={t('governance.locks.undelegatePeriod')} wrapperClassName="items-start">
        <LockPeriodDiff from={previousConviction} to={conviction.value} lockPeriods={lockPeriods} />
      </DetailRow>

      {isMultisig && (
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
            <AssetBalance value={multisigDeposit.toString()} asset={network.chain.assets[0]} />
            <AssetFiatBalance asset={network.chain.assets[0]} amount={multisigDeposit.toString()} />
          </div>
        </DetailRow>
      )}

      <FeeWithLabel
        fee={fee}
        isLoading={pendingFee}
        asset={network.chain.assets[0]}
        label={t('staking.networkFee', { count: 1 })}
      />
    </div>
  );
};

const ActionsSection = ({ onGoBack }: { onGoBack: () => void }) => {
  const { t } = useI18n();

  const canSubmit = useUnit(formModel.$canSubmit);

  return (
    <div className="flex w-full items-center justify-between">
      <Button variant="text" onClick={onGoBack}>
        {t('operation.goBackButton')}
      </Button>
      <Button form="transfer-form" type="submit" disabled={!canSubmit}>
        {t('transfer.continueButton')}
      </Button>
    </div>
  );
};

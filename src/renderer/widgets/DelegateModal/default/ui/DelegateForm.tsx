import { BN } from '@polkadot/util';
import { useGate, useStoreMap, useUnit } from 'effector-react';
import { type FormEvent, useMemo } from 'react';

import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { formatAmount, formatAsset, fromPrecision, transferableAmount } from '@/shared/lib/utils';
import { Button, DetailRow, FootnoteText, Icon, InputHint, SmallTitleText } from '@/shared/ui';
import { SignatorySelect } from '@/shared/ui-entities';
import { Modal, Tooltip } from '@/shared/ui-kit';
import { accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { OperationTitle } from '@/entities/chain';
import { BalanceDiff, LockPeriodDiff, LockValueDiff } from '@/entities/governance';
import { walletModel } from '@/entities/wallet';
import { AmountInput } from '@/features/assets-balances';
import { lockPeriodsModel, locksPeriodsAggregate } from '@/features/governance';
import { ConvictionSelect } from '@/widgets/VoteModal';
import { Fee, FeeWithLabel } from '@/widgets/transaction-fee';
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
    <Modal isOpen={isOpen} size="md" height="fit" onToggle={onClose}>
      <Modal.Title close>
        {network?.chain && (
          <OperationTitle title={t('governance.addDelegation.title')} chainId={network.chain.chainId} />
        )}
      </Modal.Title>
      <Modal.Content>
        <div className="flex max-h-[736px] w-full flex-1 flex-col px-5">
          <SmallTitleText>{t('governance.addDelegation.formTitle')}</SmallTitleText>

          <form id="transfer-form" className="mt-4 flex flex-col gap-y-4" onSubmit={submitForm}>
            <Signatories />
            <Amount />
            <Conviction />
          </form>

          <div className="flex flex-1 flex-col justify-end gap-y-6 pt-6 pb-4">
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
    fields: { conviction },
  } = useForm(formModel.form);
  const network = useUnit(formModel.$networkStore);

  if (!network) {
    return null;
  }

  return <ConvictionSelect conviction={conviction.value} onChange={conviction.onChange} />;
};

const Amount = () => {
  const { t } = useI18n();

  const {
    fields: { amount },
  } = useForm(formModel.form);

  const network = useUnit(formModel.$networkStore);
  const delegateBalanceRange = useUnit(formModel.$delegateBalanceRange);
  const account = useUnit(formModel.$account);

  if (!network) {
    return null;
  }

  const showReuseLockBtn = account?.lock.gtn(0) ?? false;

  return (
    <div className="flex flex-col gap-y-2">
      <AmountInput
        invalid={amount.hasError}
        value={amount.value}
        balance={delegateBalanceRange}
        balancePlaceholder={t('general.input.availableLabel')}
        placeholder={t('general.input.amountLabel')}
        asset={network.asset}
        onChange={amount.onChange}
      />
      {showReuseLockBtn && account && (
        <div className="flex justify-end">
          <Button
            size="sm"
            pallet="secondary"
            onClick={() => amount.onChange(fromPrecision(account.lock, network.asset.precision))}
          >
            {t('governance.vote.reuseLock')}: {formatAsset(account.lock, network.asset)}
          </Button>
        </div>
      )}
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
  const account = useUnit(formModel.$account);

  const lockPeriods = useStoreMap({
    store: lockPeriodsModel.$lockPeriods,
    keys: [network?.chain],
    fn: (locks, [chain]) => (chain ? (locks[chain.chainId] ?? null) : null),
  });

  useGate(locksPeriodsAggregate.gates.flow, { chain: network?.chain });

  if (!network || !initiator.value || !account) {
    return null;
  }

  const amountValue = new BN(formatAmount(amount.value, network.asset.precision));

  return (
    <div className="flex flex-col gap-y-2">
      <DetailRow label={t('governance.operations.transferable')} wrapperClassName="items-start">
        <BalanceDiff
          from={account.balance}
          to={new BN(account.balance).sub(amountValue)}
          asset={network.asset}
          lock={account.lock}
        />
      </DetailRow>

      <DetailRow label={t('governance.locks.governanceLock')} wrapperClassName="items-start">
        <LockValueDiff asset={network.asset} from={account.lock} to={amountValue} />
      </DetailRow>

      <DetailRow label={t('governance.locks.undelegatePeriod')} wrapperClassName="items-start">
        <LockPeriodDiff from="None" to={conviction.value} lockPeriods={lockPeriods} />
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
          <Fee fee={multisigDeposit} asset={network.chain.assets[0]!} />
        </DetailRow>
      )}

      <FeeWithLabel
        fee={fee}
        isLoading={pendingFee}
        asset={network.chain.assets[0]!}
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

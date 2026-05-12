import { useUnit } from 'effector-react';
import { type FormEvent, useMemo } from 'react';

import { type MultisigAccount } from '@/shared/core';
import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { formatBalance, getNativeAsset, transferableAmount } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Button, InputHint } from '@/shared/ui';
import { SignatorySelect } from '@/shared/ui-entities';
import { accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { walletModel } from '@/entities/wallet';
import { AmountInput } from '@/features/assets-balances';
import { networkSelectorModel } from '@/features/governance';
import { SigningPathInline } from '@/features/signing-path';
import { FeeWithLabel, MultisigDepositWithLabel } from '@/widgets/transaction-fee';
import { unlockFormAggregate } from '../model/unlockForm';

type Props = {
  onGoBack: () => void;
};

export const UnlockForm = ({ onGoBack }: Props) => {
  const { submit } = useForm(unlockFormAggregate.form);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <div className="px-5 pb-4">
      <form id="transfer-form" className="mt-4 flex flex-col gap-y-4" onSubmit={submitForm}>
        <Signatories />
        <Amount />
      </form>
      <div className="flex flex-col gap-y-6 pt-6 pb-4">
        <FeeSection />
      </div>
      <ActionsSection onGoBack={onGoBack} />
    </div>
  );
};

const Signatories = () => {
  const { t } = useI18n();

  const {
    fields: { signatory, initiator },
  } = useForm(unlockFormAggregate.form);

  const signatories = useUnit(unlockFormAggregate.$signatories);
  const signingPath = useUnit(unlockFormAggregate.$signingPath);
  const network = useUnit(networkSelectorModel.$network);
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

  if (signingPath.length >= 2) {
    const getBalance = (accountId: AccountId) => {
      const balance = balanceUtils.getBalance(balances, accountId, network.chain.chainId, network.asset.assetId);
      return balance ? transferableAmount(balance) : null;
    };

    return (
      <SigningPathInline
        chainId={network.chain.chainId}
        path={signingPath}
        asset={network.asset}
        getBalance={getBalance}
        errorText={t(signatory.errorMessage)}
        onChange={unlockFormAggregate.signingPathChanged}
      />
    );
  }

  return (
    <SignatorySelect
      signatory={signatory.value}
      signatories={signatoriesWithBalance}
      allAccounts={allAccounts}
      allWallets={allWallets}
      initiator={initiator.value}
      hasError={signatory.hasError}
      errorText={t(signatory.errorMessage)}
      network={network}
      onChange={signatory.onChange}
    />
  );
};

const Amount = () => {
  const { t } = useI18n();

  const {
    fields: { amount },
  } = useForm(unlockFormAggregate.form);

  const network = useUnit(networkSelectorModel.$network);
  if (!network) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-2">
      <AmountInput
        disabled
        invalid={amount.hasError}
        value={formatBalance(amount.value, network.asset.precision).value}
        balance={amount.value}
        placeholder={t('general.input.amountLabel')}
        asset={network.asset}
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
    fields: { initiator },
  } = useForm(unlockFormAggregate.form);

  const api = useUnit(unlockFormAggregate.$api);
  const chain = useUnit(networkSelectorModel.$governanceChain);
  const isMultisig = useUnit(unlockFormAggregate.$isMultisig);
  const fee = useUnit(unlockFormAggregate.$fee);
  const pendingFee = useUnit(unlockFormAggregate.$pendingFee);

  if (!chain || !initiator) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-2">
      {isMultisig && (
        <MultisigDepositWithLabel
          api={api}
          asset={getNativeAsset(chain.assets)!}
          threshold={(initiator.value as MultisigAccount).threshold || 1}
          onDepositChange={unlockFormAggregate.multisigDepositChanged}
        />
      )}

      <FeeWithLabel
        label={t('staking.networkFee', { count: 1 })}
        asset={getNativeAsset(chain.assets)!}
        fee={fee}
        isLoading={pendingFee}
      />
    </div>
  );
};

const ActionsSection = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const canSubmit = useUnit(unlockFormAggregate.$canSubmit);

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

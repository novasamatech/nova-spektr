import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type FormEvent, useMemo } from 'react';

import { type MultisigAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { getNativeAsset, withdrawableAmount } from '@/shared/lib/utils';
import { Alert, Button } from '@/shared/ui';
import { SignatorySelect } from '@/shared/ui-entities';
import { accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { FeeWithLabelWithDataLoading, MultisigDepositWithLabel } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { formModel } from '../model/form-model';
import { removeProxyModel } from '../model/remove-proxy-model';

type Props = {
  onGoBack: () => void;
};
export const RemoveProxyForm = ({ onGoBack }: Props) => {
  const { submit } = useForm(formModel.$proxyForm);

  const submitProxy = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <div className="px-5 pb-4">
      <form id="add-proxy-form" className="mt-4 flex flex-col gap-y-4" onSubmit={submitProxy}>
        <Signatories />
      </form>
      <div className="flex flex-col gap-y-6 pb-4 pt-6">
        <FeeSection />
        <FeeError />
      </div>
      <ActionSection onGoBack={onGoBack} />
    </div>
  );
};

const Signatories = () => {
  const { t } = useI18n();

  const {
    fields: { signatory },
  } = useForm(formModel.$proxyForm);
  const account = useUnit(formModel.$account);

  const signatories = useUnit(formModel.$signatories);
  const chain = useUnit(removeProxyModel.$chain);
  const isMultisig = useUnit(formModel.$isMultisig);

  const allAccounts = useUnit(accounts.$list);
  const allWallets = useUnit(walletModel.$wallets);
  const balances = useUnit(balanceModel.$balances);

  const signatoriesWithBalance = useMemo(() => {
    if (!signatories || !chain) {
      return [];
    }

    return signatories.map((signatory) => {
      const balance = balanceUtils.getBalance(
        balances,
        signatory.accountId,
        chain.chainId,
        getNativeAsset(chain.assets).assetId.toString(),
      );
      return { account: signatory, balance: withdrawableAmount(balance) };
    });
  }, [signatories, balances]);

  if (!isMultisig || !chain || !account) {
    return null;
  }

  return (
    <SignatorySelect
      signatory={signatory.value}
      signatories={signatoriesWithBalance}
      allAccounts={allAccounts}
      initiator={account}
      allWallets={allWallets}
      hasError={signatory.hasError()}
      errorText={t(signatory.errorText())}
      network={{ chain: chain, asset: chain.assets[0] }}
      onChange={signatory.onChange}
    />
  );
};

const FeeSection = () => {
  const api = useUnit(formModel.$api);
  const fakeTx = useUnit(formModel.$fakeTx);
  const isMultisig = useUnit(formModel.$isMultisig);
  const chain = useUnit(removeProxyModel.$chain);
  const account = useUnit(removeProxyModel.$realAccount);

  if (!chain) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-2">
      {isMultisig && (
        <MultisigDepositWithLabel
          api={api}
          asset={chain.assets[0]}
          threshold={(account as MultisigAccount).threshold}
          onDepositChange={formModel.events.multisigDepositChanged}
        />
      )}

      <FeeWithLabelWithDataLoading
        api={api}
        asset={chain.assets[0]}
        transaction={fakeTx}
        onFeeChange={formModel.events.feeChanged}
        onFeeLoading={formModel.events.isFeeLoadingChanged}
      />
    </div>
  );
};

const FeeError = () => {
  const { t } = useI18n();

  const {
    fields: { signatory },
  } = useForm(formModel.$proxyForm);

  const isMultisig = useUnit(formModel.$isMultisig);

  return (
    <Alert title={t('proxy.addProxy.balanceAlertTitle')} active={signatory.hasError()} variant="error">
      <Alert.Item withDot={false}>
        {isMultisig ? t('proxy.addProxy.balanceAlertMultisig') : t('proxy.addProxy.balanceAlertRegular')}
      </Alert.Item>
    </Alert>
  );
};

const ActionSection = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const canSubmit = useUnit(formModel.$canSubmit);

  return (
    <div className="mt-4 flex items-center justify-between">
      <Button variant="text" onClick={onGoBack}>
        {t('operation.goBackButton')}
      </Button>
      <Button form="add-proxy-form" type="submit" disabled={!canSubmit}>
        {t('operation.continueButton')}
      </Button>
    </div>
  );
};

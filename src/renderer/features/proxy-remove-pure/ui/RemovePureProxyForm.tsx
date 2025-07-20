import { useUnit } from 'effector-react';
import { type FormEvent, useMemo } from 'react';

import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { getNativeAsset, withdrawableAmount } from '@/shared/lib/utils';
import { Alert, Button } from '@/shared/ui';
import { SignatorySelect } from '@/shared/ui-entities';
import { accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { FeeWithLabel, MultisigDepositFee } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { removePureProxyModel } from '../model/remove-pure-proxy-model';

type Props = {
  onGoBack: () => void;
};
export const RemovePureProxyForm = ({ onGoBack }: Props) => {
  const { submit } = useForm(removePureProxyModel.form);

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
  } = useForm(removePureProxyModel.form);

  const proxiedAccount = useUnit(removePureProxyModel.$proxiedAccount);

  const signatories = useUnit(removePureProxyModel.$signatories);
  const chain = useUnit(removePureProxyModel.$chain);
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

  if (!chain || !proxiedAccount) {
    return null;
  }

  return (
    <SignatorySelect
      signatory={signatory.value}
      signatories={signatoriesWithBalance}
      allAccounts={allAccounts}
      initiator={proxiedAccount}
      allWallets={allWallets}
      hasError={signatory.hasError}
      errorText={t(signatory.errorMessage)}
      network={{ chain, asset: getNativeAsset(chain.assets) }}
      onChange={signatory.onChange}
    />
  );
};

const FeeSection = () => {
  const fee = useUnit(removePureProxyModel.$fee);
  const multisigDeposit = useUnit(removePureProxyModel.$multisigDeposit);
  const chain = useUnit(removePureProxyModel.$chain);

  if (!chain) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-2">
      {!multisigDeposit.isZero() && (
        <MultisigDepositFee asset={getNativeAsset(chain.assets)} multisigDeposit={multisigDeposit} />
      )}

      <FeeWithLabel asset={getNativeAsset(chain.assets)} fee={fee} />
    </div>
  );
};

const FeeError = () => {
  const { t } = useI18n();

  const {
    fields: { signatory },
  } = useForm(removePureProxyModel.form);

  return (
    <Alert title={t('proxy.addProxy.balanceAlertTitle')} active={signatory.hasError} variant="error">
      <Alert.Item withDot={false}>{t(signatory.errorMessage)}</Alert.Item>
    </Alert>
  );
};

const ActionSection = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const canSubmit = useUnit(removePureProxyModel.$canSubmit);

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

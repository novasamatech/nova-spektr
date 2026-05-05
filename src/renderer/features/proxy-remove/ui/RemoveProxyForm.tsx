import { useUnit } from 'effector-react';
import { type FormEvent, useMemo } from 'react';

import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { getNativeAsset, withdrawableAmount } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { SignatorySelect, TransactionValidationError } from '@/shared/ui-entities';
import { accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { transactionService } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
// eslint-disable-next-line boundaries/entry-point -- direct import to avoid circular: drafts -> accounts-structure -> wallet-details -> proxy-remove
import { InitiateDraftButton } from '@/features/drafts/components/InitiateDraftButton';
import { SigningPathControl } from '@/features/signing-path';
import { FeeWithLabel, MultisigDepositFee } from '@/widgets/transaction-fee';
import { removeProxyModel } from '../model/remove-proxy-model';

type Props = {
  onGoBack: () => void;
};
export const RemoveProxyForm = ({ onGoBack }: Props) => {
  const { submit } = useForm(removeProxyModel.form);
  const errors = useUnit(removeProxyModel.$errors);
  const wallets = useUnit(walletModel.$wallets);

  const submitProxy = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <div className="px-5 pb-4">
      <TransactionValidationError errors={errors} wallets={wallets} />
      <form id="add-proxy-form" className="mt-4 flex flex-col gap-y-4" onSubmit={submitProxy}>
        <Signatories />
      </form>
      <div className="flex flex-col gap-y-6 pt-6 pb-4">
        <FeeSection />
      </div>
      <ActionSection onGoBack={onGoBack} />
    </div>
  );
};

const Signatories = () => {
  const { t } = useI18n();

  const {
    fields: { signatory },
  } = useForm(removeProxyModel.form);

  const proxiedAccount = useUnit(removeProxyModel.$proxiedAccount);

  const signatories = useUnit(removeProxyModel.$signatories);
  const signingPath = useUnit(removeProxyModel.$signingPath);
  const chain = useUnit(removeProxyModel.$chain);
  const allAccounts = useUnit(accounts.$list);
  const allWallets = useUnit(walletModel.$wallets);
  const balances = useUnit(balanceModel.$balanceMap);

  const signatoriesWithBalance = useMemo(() => {
    if (!signatories || !chain) {
      return [];
    }

    return signatories.map((signatory) => {
      const balance = balanceUtils.getBalance(
        balances,
        signatory.accountId,
        chain.chainId,
        getNativeAsset(chain.assets).assetId,
      );
      return { account: signatory, balance: withdrawableAmount(balance) };
    });
  }, [signatories, balances]);

  if (!chain || !proxiedAccount) {
    return null;
  }

  const pathChip = (
    <SigningPathControl chainId={chain.chainId} path={signingPath} onChange={removeProxyModel.signingPathChanged} />
  );

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
      action={pathChip}
      onChange={signatory.onChange}
    />
  );
};

const FeeSection = () => {
  const fee = useUnit(removeProxyModel.$fee);
  const multisigDeposit = useUnit(removeProxyModel.$multisigDeposit);
  const chain = useUnit(removeProxyModel.$chain);

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

const ActionSection = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const canSubmit = useUnit(removeProxyModel.$canSubmit);
  const coreTx = useUnit(removeProxyModel.$coreTx);
  const api = useUnit(removeProxyModel.$api);
  const chainId = useUnit(removeProxyModel.$proxyAccount.map((proxy) => proxy?.chainId ?? null));

  const draftCallData = transactionService.getCallDataHex(coreTx, api);

  return (
    <div className="mt-4 flex items-center justify-between">
      <Button variant="text" onClick={onGoBack}>
        {t('operation.goBackButton')}
      </Button>
      <div className="flex items-center gap-3">
        <InitiateDraftButton
          callData={draftCallData}
          chainId={chainId}
          source="remove-proxy"
          onDraftCreated={removeProxyModel.flowFinished}
        />
        <Button form="add-proxy-form" type="submit" disabled={!canSubmit}>
          {t('operation.continueButton')}
        </Button>
      </div>
    </div>
  );
};

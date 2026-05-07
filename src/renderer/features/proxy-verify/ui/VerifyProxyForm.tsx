import { useUnit } from 'effector-react';
import { type FormEvent, useMemo } from 'react';

import { type ChainId } from '@/shared/core';
import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { getNativeAsset, withdrawableAmount } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Button, FootnoteText } from '@/shared/ui';
import { SignatorySelect, TransactionValidationError } from '@/shared/ui-entities';
import { accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { SigningPathInline } from '@/features/signing-path';
import { FeeWithLabel, MultisigDepositFee } from '@/widgets/transaction-fee';
import { verifyProxyModel } from '../model/verify-proxy-model';

type Props = {
  chainId: ChainId;
  onGoBack: () => void;
};

export const VerifyProxyForm = ({ chainId, onGoBack }: Props) => {
  const { submit } = useForm(verifyProxyModel.form);
  const errors = useUnit(verifyProxyModel.$errors);
  const wallets = useUnit(walletModel.$wallets);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <div className="px-5 pb-4">
      <TransactionValidationError errors={errors} wallets={wallets} />
      <form id="verify-proxy-form" className="mt-4 flex flex-col gap-y-4" onSubmit={submitForm}>
        <Signatories chainId={chainId} />
      </form>
      <div className="flex flex-col gap-y-6 pt-6 pb-4">
        <FeeSection chainId={chainId} />
      </div>
      <ActionSection onGoBack={onGoBack} />
    </div>
  );
};

const Signatories = ({ chainId }: { chainId: ChainId }) => {
  const { t } = useI18n();

  const {
    fields: { signatory },
  } = useForm(verifyProxyModel.form);

  const initiator = useUnit(verifyProxyModel.$verifyStore.map((s) => s?.initiator ?? null));

  const signatories = useUnit(verifyProxyModel.$signatories);
  const signingPath = useUnit(verifyProxyModel.$signingPath);
  const chains = useUnit(networkModel.$chains);
  const chainFromStore = useUnit(verifyProxyModel.$verifyStore.map((s) => s?.chain ?? null));
  const chain = chainFromStore ?? chains[chainId] ?? null;
  const allAccounts = useUnit(accounts.$list);
  const allWallets = useUnit(walletModel.$wallets);
  const balances = useUnit(balanceModel.$balanceMap);
  const formErrors = useUnit(verifyProxyModel.$errors);

  const signatoriesWithBalance = useMemo(() => {
    if (!signatories || !chain) {
      return [];
    }

    return signatories.map((signatoryItem) => {
      const balance = balanceUtils.getBalance(
        balances,
        signatoryItem.accountId,
        chain.chainId,
        getNativeAsset(chain.assets).assetId,
      );
      return { account: signatoryItem, balance: withdrawableAmount(balance) };
    });
  }, [signatories, balances, chain]);

  const errorAccountIds = useMemo<ReadonlySet<AccountId>>(() => {
    const ids = new Set<AccountId>();
    for (const e of formErrors) {
      if ('account' in e && e.account?.accountId) ids.add(e.account.accountId);
    }
    return ids;
  }, [formErrors]);

  if (!chain) {
    return null;
  }

  if (!initiator) {
    return (
      <FootnoteText className="text-text-tertiary">
        {t('walletDetails.proxies.verifyFormResolvingAccounts')}
      </FootnoteText>
    );
  }

  if (signingPath.length >= 2) {
    const nativeAsset = getNativeAsset(chain.assets);
    const getBalance = (accountId: AccountId) => {
      const balance = balanceUtils.getBalance(balances, accountId, chain.chainId, nativeAsset.assetId);
      return balance ? withdrawableAmount(balance) : null;
    };

    return (
      <SigningPathInline
        chainId={chain.chainId}
        path={signingPath}
        asset={nativeAsset}
        getBalance={getBalance}
        errorAccountIds={errorAccountIds}
        errorText={t(signatory.errorMessage)}
        onChange={verifyProxyModel.events.signingPathChanged}
      />
    );
  }

  return (
    <SignatorySelect
      signatory={signatory.value}
      signatories={signatoriesWithBalance}
      allAccounts={allAccounts}
      initiator={initiator}
      allWallets={allWallets}
      hasError={signatory.hasError}
      errorText={t(signatory.errorMessage)}
      network={{ chain, asset: getNativeAsset(chain.assets) }}
      onChange={signatory.onChange}
    />
  );
};

const FeeSection = ({ chainId }: { chainId: ChainId }) => {
  const fee = useUnit(verifyProxyModel.$fee);
  const multisigDeposit = useUnit(verifyProxyModel.$multisigDeposit);
  const chains = useUnit(networkModel.$chains);
  const chainFromStore = useUnit(verifyProxyModel.$verifyStore.map((s) => s?.chain ?? null));
  const chain = chainFromStore ?? chains[chainId] ?? null;

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

const ActionSection = ({ onGoBack }: { onGoBack: () => void }) => {
  const { t } = useI18n();

  const canSubmit = useUnit(verifyProxyModel.$canSubmit);

  return (
    <div className="mt-4 flex items-center justify-between">
      <Button variant="text" onClick={onGoBack}>
        {t('operation.goBackButton')}
      </Button>
      <Button form="verify-proxy-form" type="submit" disabled={!canSubmit}>
        {t('operation.continueButton')}
      </Button>
    </div>
  );
};

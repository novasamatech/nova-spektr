import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';

import { type ChainId } from '@/shared/core';
import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { getNativeAsset, withdrawableAmount } from '@/shared/lib/utils';
import { Button, FootnoteText } from '@/shared/ui';
import { TransactionValidationError } from '@/shared/ui-entities';
import { Field, Input } from '@/shared/ui-kit';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { SigningPathSection } from '@/features/signing-path';
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
        <MemoField />
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
  const signingPath = useUnit(verifyProxyModel.$signingPath);
  const chains = useUnit(networkModel.$chains);
  const chainFromStore = useUnit(verifyProxyModel.$verifyStore.map((s) => s?.chain ?? null));
  const chain = chainFromStore ?? chains[chainId] ?? null;
  const formErrors = useUnit(verifyProxyModel.$errors);

  if (chain && !initiator) {
    return (
      <FootnoteText className="text-text-tertiary">
        {t('walletDetails.proxies.verifyFormResolvingAccounts')}
      </FootnoteText>
    );
  }

  const nativeAsset = chain ? getNativeAsset(chain.assets) : null;

  return (
    <SigningPathSection
      signingPath={signingPath}
      chain={chain}
      asset={nativeAsset}
      txErrors={formErrors}
      errorText={t(signatory.errorMessage)}
      balanceExtractor={(b) => (b ? withdrawableAmount(b) : null)}
      onChange={verifyProxyModel.events.signingPathChanged}
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

const MemoField = () => {
  const { t } = useI18n();
  const {
    fields: { memo },
  } = useForm(verifyProxyModel.form);

  return (
    <Field text={t('walletDetails.proxies.verifyMemoLabel')}>
      <Input
        placeholder={t('walletDetails.proxies.verifyMemoPlaceholder')}
        value={memo.value}
        maxLength={200}
        onChange={memo.onChange}
      />
    </Field>
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

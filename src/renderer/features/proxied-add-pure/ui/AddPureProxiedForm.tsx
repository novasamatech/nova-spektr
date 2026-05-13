import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';

import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { getNativeAsset, withdrawableAmount } from '@/shared/lib/utils';
import { Alert, Button, InputHint } from '@/shared/ui';
import { AccountSelect, ChainSelect, TransactionValidationError } from '@/shared/ui-entities';
import { Field } from '@/shared/ui-kit';
import { balanceModel } from '@/entities/balance';
import { PureProxyPopover } from '@/entities/proxy';
import { transactionService } from '@/entities/transaction';
import { walletModel, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
// eslint-disable-next-line boundaries/entry-point -- direct import to avoid circular: drafts → accounts-structure → wallet-details → proxied-add-pure
import { InitiateDraftButton } from '@/features/drafts/components/InitiateDraftButton';
import { SigningPathSection } from '@/features/signing-path';
import { FeeWithLabel, MultisigDepositFee, ProxyDeposit, ProxyDepositLabel } from '@/widgets/transaction-fee';
import { addPureProxiedModel } from '../model/add-pure-proxied-model';
import { formModel } from '../model/form-model';

export const AddPureProxiedForm = () => {
  const { t } = useI18n();

  const { submit } = useForm(formModel.form);
  const errors = useUnit(formModel.$errors);
  const wallets = useUnit(walletModel.$wallets);

  const submitProxy = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <div className="px-5 pb-4">
      <TransactionValidationError errors={errors} wallets={wallets} />
      <PureProxyPopover>{t('proxy.pureProxyTooltip.button')}</PureProxyPopover>
      <form id="add-proxy-form" className="mt-4 flex flex-col gap-y-4" onSubmit={submitProxy}>
        <NetworkSelector />
        <AccountSelector />
        <Signatories />
      </form>
      <div className="flex flex-col gap-y-6 pt-6 pb-4">
        <FeeSection />
        <FeeError />
      </div>
      <ButtonsSection />
    </div>
  );
};

const NetworkSelector = () => {
  const { t } = useI18n();

  const {
    fields: { chain },
  } = useForm(formModel.form);

  const availableChains = useUnit(formModel.$availableChains);

  return (
    <Field text={t('proxy.addProxy.networkLabel')}>
      <ChainSelect
        placeholder={t('proxy.addProxy.networkPlaceholder')}
        value={chain.value}
        options={availableChains}
        onChange={chain.onChange}
      />
      <InputHint variant="error" active={chain.hasError}>
        {t(chain.errorMessage)}
      </InputHint>
    </Field>
  );
};

const AccountSelector = () => {
  const { t } = useI18n();

  const {
    fields: { initiator, chain },
  } = useForm(formModel.form);

  const accounts = useUnit(formModel.$accounts);
  const wallet = useUnit(walletSelect.$selectedWallet);
  const balances = useUnit(balanceModel.$balanceMap);

  const chainValue = chain.value;
  const asset = getNativeAsset(chainValue?.assets ?? []);

  if (accounts.length < 2 || walletUtils.isFlexibleMultisig(wallet) || !chainValue) {
    return null;
  }

  return (
    <Field text={t('proxy.addProxy.accountLabel')}>
      <AccountSelect
        placeholder={t('proxy.addProxy.accountPlaceholder')}
        options={accounts}
        value={initiator.value}
        asset={asset}
        chain={chainValue}
        balances={balances}
        balanceType="transferable"
        onChange={initiator.onChange}
      />
    </Field>
  );
};

const Signatories = () => {
  const { t } = useI18n();

  const {
    fields: { chain, signatory },
  } = useForm(formModel.form);

  const signingPath = useUnit(formModel.$signingPath);
  const formErrors = useUnit(formModel.$errors);

  const nativeAsset = chain.value ? getNativeAsset(chain.value.assets) : null;

  return (
    <SigningPathSection
      signingPath={signingPath}
      chain={chain.value ?? null}
      asset={nativeAsset}
      txErrors={formErrors}
      errorText={t(signatory.errorMessage)}
      balanceExtractor={b => (b ? withdrawableAmount(b) : null)}
      onChange={formModel.signingPathChanged}
    />
  );
};

const FeeSection = () => {
  const {
    fields: { chain },
  } = useForm(formModel.form);
  const fee = useUnit(formModel.$fee);
  const pendingFee = useUnit(formModel.$pendingFee);

  const api = useUnit(formModel.$api);
  const multisigDeposit = useUnit(formModel.$multisigDeposit);
  const isMultisig = useUnit(formModel.$isMultisig);

  if (!chain.value) return null;

  return (
    <div className="flex flex-col gap-y-2">
      <ProxyDepositLabel>
        <ProxyDeposit
          api={api}
          proxyNumber={1}
          deposit="0"
          asset={getNativeAsset(chain.value.assets)}
          onDepositChange={formModel.proxyDepositChanged}
          onDepositLoading={formModel.isProxyDepositLoadingChanged}
        />
      </ProxyDepositLabel>

      {isMultisig && (
        <MultisigDepositFee asset={getNativeAsset(chain.value.assets)} multisigDeposit={multisigDeposit.toString()} />
      )}

      <FeeWithLabel asset={getNativeAsset(chain.value.assets)} fee={fee} isLoading={pendingFee} />
    </div>
  );
};

const FeeError = () => {
  const { t } = useI18n();

  const {
    fields: { initiator: account },
  } = useForm(formModel.form);

  const isMultisig = useUnit(formModel.$isMultisig);

  return (
    <Alert title={t('proxy.addProxy.balanceAlertTitle')} active={account.hasError} variant="error">
      <Alert.Item withDot={false}>
        {isMultisig ? t('proxy.addProxy.balanceAlertMultisig') : t('proxy.addProxy.balanceAlertRegular')}
      </Alert.Item>
    </Alert>
  );
};

const ButtonsSection = () => {
  const { t } = useI18n();

  const canSubmit = useUnit(formModel.$canSubmit);
  const coreTx = useUnit(formModel.$coreTx);
  const api = useUnit(formModel.$api);
  const {
    fields: { chain },
  } = useForm(formModel.form);

  const draftCallData = transactionService.getCallDataHex(coreTx, api);

  return (
    <div className="mt-4 flex items-center justify-end gap-3">
      <InitiateDraftButton
        callData={draftCallData}
        chainId={chain.value?.chainId}
        source="add-pure-proxy"
        onDraftCreated={addPureProxiedModel.output.flowFinished}
      />
      <Button form="add-proxy-form" type="submit" disabled={!canSubmit}>
        {t('operation.continueButton')}
      </Button>
    </div>
  );
};

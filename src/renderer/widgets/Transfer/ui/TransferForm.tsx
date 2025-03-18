import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';

import { type ChainId, type MultisigAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatBalance, nonNullable, toAddress, toShortAddress, validateAddress } from '@/shared/lib/utils';
import { Button, Icon, Identicon, InputHint } from '@/shared/ui';
import { Address as AccountAddress, AssetBalance } from '@/shared/ui-entities';
import { Box, Field, Input, Select } from '@/shared/ui-kit';
import { type AnyAccount } from '@/domains/network';
import { ChainTitle } from '@/entities/chain';
import { SignatorySelector } from '@/entities/operations';
import { DeliveryFeeWithLabel, FeeWithLabel, MultisigDepositWithLabel, XcmFeeWithLabel } from '@/entities/transaction';
import { AccountSelectModal, DeliveryFeeAlert, ProxyWalletAlert, accountUtils, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { AmountInput } from '@/features/assets-balances';
import { formModel } from '../model/form-model';

type Props = {
  onGoBack: () => void;
};

export const TransferForm = ({ onGoBack }: Props) => {
  const { submit } = useForm(formModel.$transferForm);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <div className="px-5 pb-4">
      <form id="transfer-form" className="mt-4 flex flex-col gap-y-4" onSubmit={submitForm}>
        <AlertForProxyFee />
        <XcmChainSelector />
        <AccountSelector />
        <Signatories />
        <Destination />
        <Amount />
      </form>
      <div className="flex flex-col gap-y-6 pb-4 pt-6">
        <FeeSection />
      </div>
      <Box>
        <AlertForDeliveryFee />
      </Box>
      <ActionsSection onGoBack={onGoBack} />

      <MyselfAccountModal />
    </div>
  );
};

const AlertForProxyFee = () => {
  const {
    fields: { account },
  } = useForm(formModel.$transferForm);

  const fee = useUnit(formModel.$fee);
  const { native } = useUnit(formModel.$proxyBalance);
  const network = useUnit(formModel.$networkStore);
  const proxyWallet = useUnit(formModel.$proxyWallet);

  if (!network || !proxyWallet || !account.hasError()) {
    return null;
  }

  const formattedFee = formatBalance(fee, network.asset.precision).value;
  const formattedBalance = formatBalance(native, network.asset.precision).value;

  return (
    <ProxyWalletAlert
      wallet={proxyWallet}
      fee={formattedFee}
      balance={formattedBalance}
      symbol={network.asset.symbol}
      onClose={account.resetErrors}
    />
  );
};

const AccountSelector = () => {
  const { t } = useI18n();

  const {
    fields: { account },
  } = useForm(formModel.$transferForm);

  const accounts = useUnit(formModel.$accounts);
  const network = useUnit(formModel.$networkStore);
  const wallet = useUnit(walletSelect.$selectedWallet);

  if (!network || accounts.length <= 1 || walletUtils.isFlexibleMultisig(wallet)) {
    return null;
  }

  const selectAccount = (id: AnyAccount['id']) => {
    const accountMatch = accounts.find(({ account }) => account.id === id);
    if (!accountMatch) return;

    account.onChange(accountMatch.account);
  };

  return (
    <Field text={t('operation.selectAccountLabel')}>
      <Select
        placeholder={t('operation.selectAccount')}
        value={account.value ? account.value.id.toString() : null}
        onChange={selectAccount}
      >
        {accounts.map(({ account, balances }) => {
          const isShard = accountUtils.isVaultShardAccount(account);
          const address = toAddress(account.accountId, { prefix: network.chain.addressPrefix });

          return (
            <Select.Item key={account.id} value={account.id}>
              <div className="flex w-full items-center justify-between">
                <AccountAddress
                  showIcon
                  iconSize={20}
                  variant="short"
                  address={address}
                  title={isShard ? toShortAddress(address, 16) : account.name}
                  canCopy={false}
                />
                <AssetBalance value={balances?.balance} asset={network.asset} />
              </div>
            </Select.Item>
          );
        })}
      </Select>
    </Field>
  );
};

const Signatories = () => {
  const { t } = useI18n();

  const {
    fields: { signatory },
  } = useForm(formModel.$transferForm);

  const signatories = useUnit(formModel.$signatories);
  const isMultisig = useUnit(formModel.$isMultisig);
  const network = useUnit(formModel.$networkStore);

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

const XcmChainSelector = () => {
  const { t } = useI18n();

  const {
    fields: { xcmChain },
  } = useForm(formModel.$transferForm);

  const chains = useUnit(formModel.$chains);

  if (chains.length <= 1) {
    return null;
  }

  const [nativeChain, ...xcmChains] = chains;

  const selectChain = (chainId: ChainId) => {
    const chainMatch = chains.find((chain) => chain.chainId === chainId);
    if (!chainMatch) return;

    xcmChain.onChange(chainMatch);
  };

  return (
    <Field text={t('transfer.destinationChainLabel')}>
      <Select
        placeholder={t('transfer.destinationChainPlaceholder')}
        value={xcmChain.value.chainId}
        onChange={selectChain}
      >
        <Select.Group title={t('transfer.onChainPlaceholder')}>
          <Select.Item value={nativeChain.chainId}>
            <ChainTitle chainId={nativeChain.chainId} fontClass="text-text-primary" />
          </Select.Item>
        </Select.Group>
        <Select.Group title={t('transfer.crossChainPlaceholder')}>
          {xcmChains.map((chain) => (
            <Select.Item key={chain.chainId} value={chain.chainId}>
              <ChainTitle chainId={chain.chainId} fontClass="text-text-primary" />
            </Select.Item>
          ))}
        </Select.Group>
      </Select>
    </Field>
  );
};

const Destination = () => {
  const { t } = useI18n();

  const {
    fields: { destination, xcmChain },
  } = useForm(formModel.$transferForm);

  const isMyselfXcmEnabled = useUnit(formModel.$isMyselfXcmEnabled);

  const prefixElement = (
    <div className="flex h-auto items-center">
      {validateAddress(destination.value, xcmChain.value) ? (
        <Identicon size={20} address={destination.value} background={false} />
      ) : (
        <Icon size={20} name="emptyIdenticon" />
      )}
    </div>
  );

  const suffixElement = (
    <Button size="sm" pallet="secondary" onClick={() => formModel.events.myselfClicked()}>
      {t('transfer.myselfButton')}
    </Button>
  );

  return (
    <Field text={t('transfer.recipientLabel')}>
      <Input
        placeholder={t('transfer.recipientPlaceholder')}
        invalid={destination.hasError()}
        value={destination.value}
        prefixElement={prefixElement}
        suffixElement={isMyselfXcmEnabled && suffixElement}
        onChange={destination.onChange}
      />
      <InputHint active={destination.hasError()} variant="error">
        {t(destination.errorText())}
      </InputHint>
    </Field>
  );
};

const Amount = () => {
  const { t } = useI18n();

  const {
    fields: { amount },
  } = useForm(formModel.$transferForm);

  const accountBalance = useUnit(formModel.$accountBalance);
  const network = useUnit(formModel.$networkStore);

  if (!network) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-2">
      <AmountInput
        invalid={amount.hasError()}
        value={amount.value}
        balance={accountBalance?.balance}
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
  const {
    fields: { account },
  } = useForm(formModel.$transferForm);

  const api = useUnit(formModel.$api);
  const network = useUnit(formModel.$networkStore);
  const transaction = useUnit(formModel.$transaction);
  const coreTx = useUnit(formModel.$coreTx);
  const fakeTx = useUnit(formModel.$fakeTx);
  const isMultisig = useUnit(formModel.$isMultisig);
  const isXcm = useUnit(formModel.$isXcm);
  const xcmConfig = useUnit(formModel.$xcmConfig);
  const xcmApi = useUnit(formModel.$xcmApi);
  const deliveryFee = useUnit(formModel.$deliveryFee);

  if (!network) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-2">
      {isMultisig && (
        <MultisigDepositWithLabel
          api={api}
          asset={network.chain.assets[0]}
          threshold={(account.value as MultisigAccount).threshold || 1}
          onDepositChange={formModel.events.multisigDepositChanged}
        />
      )}

      <FeeWithLabel
        api={api}
        asset={network.chain.assets[0]}
        transaction={transaction?.wrappedTx || fakeTx}
        onFeeChange={formModel.events.feeChanged}
        onFeeLoading={formModel.events.isFeeLoadingChanged}
      />

      {isXcm && xcmApi && xcmConfig && (
        <XcmFeeWithLabel
          api={xcmApi}
          config={xcmConfig}
          asset={network.asset}
          transaction={coreTx || fakeTx}
          onFeeChange={formModel.events.xcmFeeChanged}
          onFeeLoading={formModel.events.isXcmFeeLoadingChanged}
        />
      )}

      {nonNullable(deliveryFee) && <DeliveryFeeWithLabel fee={deliveryFee} asset={network.chain.assets[0]} />}
    </div>
  );
};

const AlertForDeliveryFee = () => {
  const {
    fields: { account },
  } = useForm(formModel.$transferForm);

  const deliveryFee = useUnit(formModel.$deliveryFee);
  const accountBalance = useUnit(formModel.$accountBalance);
  const network = useUnit(formModel.$networkStore);
  const hasDeliveryError = useUnit(formModel.$hasDeliveryError);
  const asset = network?.chain.assets.at(0);

  if (!account.value || !asset || !network || !deliveryFee || !hasDeliveryError || !accountBalance) {
    return null;
  }

  const formattedFee = formatBalance(deliveryFee, asset.precision).value;
  const formattedBalance = formatBalance(accountBalance.native, asset.precision).value;

  return (
    <DeliveryFeeAlert
      address={toAddress(account.value.accountId, { prefix: network.chain.addressPrefix })}
      fee={formattedFee}
      balance={formattedBalance}
      symbol={asset.symbol}
      onClose={account.resetErrors}
    />
  );
};

const MyselfAccountModal = () => {
  const {
    fields: { xcmChain },
  } = useForm(formModel.$transferForm);

  const isXcm = useUnit(formModel.$isXcm);
  const network = useUnit(formModel.$networkStore);
  const destinationAccounts = useUnit(formModel.$destinationAccounts);
  const isMyselfXcmOpened = useUnit(formModel.$isMyselfXcmOpened);

  if (!isXcm || !network || destinationAccounts.length === 0) {
    return null;
  }

  return (
    <AccountSelectModal
      isOpen={isMyselfXcmOpened}
      accounts={destinationAccounts}
      chain={xcmChain.value}
      onClose={formModel.events.xcmDestinationCancelled}
      onSelect={({ accountId }) => formModel.events.xcmDestinationSelected(accountId)}
    />
  );
};

const ActionsSection = ({ onGoBack }: Props) => {
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

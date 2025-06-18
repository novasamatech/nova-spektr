import { BN_ZERO } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { type ChainId, type MultisigAccount } from '@/shared/core';
import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import {
  formatBalance,
  getNativeAsset,
  nonNullable,
  toAddress,
  validateAddress,
  withdrawableAmountBN,
} from '@/shared/lib/utils';
import { Button, Icon, Identicon, InputHint } from '@/shared/ui';
import { Box, Field, Input, Select } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { SignatorySelector } from '@/entities/operations';
import { DeliveryFeeWithLabel, FeeWithLabel, MultisigDepositWithLabel, XcmFeeWithLabel } from '@/entities/transaction';
import { AccountSelectModal, DeliveryFeeAlert } from '@/entities/wallet';
import { AmountInput } from '@/features/assets-balances';
import { balanceModel, balanceUtils } from '../../../../entities/balance';
import { formModel } from '../model/form-model';

type Props = {
  onGoBack: () => void;
};

export const TransferForm = ({ onGoBack }: Props) => {
  const { submit } = useForm(formModel.form);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <div className="px-5 pb-4">
      <form id="transfer-form" className="mt-4 flex flex-col gap-y-4" onSubmit={submitForm}>
        <XcmChainSelector />
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

const Signatories = () => {
  const { t } = useI18n();

  const {
    fields: { signatory },
  } = useForm(formModel.form);

  const signatories = useUnit(formModel.$signatories);
  const network = useUnit(formModel.$networkStore);
  const balances = useUnit(balanceModel.$balances);

  if (!network) {
    return null;
  }

  const options = signatories.map((signer) => {
    const balance = balanceUtils.getBalance(
      balances,
      signer.accountId,
      network.chain.chainId,
      network.asset.assetId.toString(),
    );

    return { signer, balance: balance ? withdrawableAmountBN(balance) : BN_ZERO };
  });

  return (
    <SignatorySelector
      signatory={signatory.value}
      signatories={options}
      asset={getNativeAsset(network.chain.assets)}
      addressPrefix={network.chain.addressPrefix}
      hasError={signatory.hasError}
      errorText={t(signatory.errorMessage)}
      onChange={signatory.onChange}
    />
  );
};

const XcmChainSelector = () => {
  const { t } = useI18n();

  const {
    fields: { destinationChain },
  } = useForm(formModel.form);

  const chains = useUnit(formModel.$destinationChains);

  if (chains.length <= 1) {
    return null;
  }

  const [nativeChain, ...xcmChains] = chains;

  const selectChain = (chainId: ChainId) => {
    const chainMatch = chains.find((chain) => chain.chainId === chainId);
    if (!chainMatch) return;

    destinationChain.onChange(chainMatch);
  };

  return (
    <Field text={t('transfer.destinationChainLabel')}>
      <Select
        placeholder={t('transfer.destinationChainPlaceholder')}
        value={destinationChain.value?.chainId ?? null}
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
    fields: { destination, destinationChain },
  } = useForm(formModel.form);

  const isMyselfXcmEnabled = useUnit(formModel.$isMyselfXcmEnabled);

  const prefixElement = (
    <div className="flex h-auto items-center">
      {nonNullable(destinationChain.value) && validateAddress(destination.value, destinationChain.value) ? (
        <Identicon size={20} address={destination.value} background={false} />
      ) : (
        <Icon size={20} name="emptyIdenticon" />
      )}
    </div>
  );

  const suffixElement = (
    <Button size="sm" pallet="secondary" onClick={() => formModel.myselfClicked()}>
      {t('transfer.myselfButton')}
    </Button>
  );

  return (
    <Field text={t('transfer.recipientLabel')}>
      <Input
        placeholder={t('transfer.recipientPlaceholder')}
        testId={TEST_IDS.OPERATIONS.RECIPIENT_INPUT}
        invalid={destination.hasError}
        value={destination.value}
        prefixElement={prefixElement}
        suffixElement={isMyselfXcmEnabled && suffixElement}
        onChange={destination.onChange}
      />
      <InputHint active={destination.hasError} variant="error">
        {t(destination.errorMessage)}
      </InputHint>
    </Field>
  );
};

const Amount = () => {
  const { t } = useI18n();

  const {
    fields: { amount },
  } = useForm(formModel.form);

  const accountBalance = useUnit(formModel.$initiatorBalance);
  const network = useUnit(formModel.$networkStore);

  if (!network) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-2">
      <AmountInput
        invalid={amount.hasError}
        value={amount.value}
        balance={accountBalance.transferable.toString() ?? null}
        balancePlaceholder={t('general.input.availableLabel')}
        placeholder={t('general.input.amountLabel')}
        asset={network.asset}
        testId={TEST_IDS.OPERATIONS.AMOUNT_INPUT}
        onChange={amount.onChange}
      />
      <InputHint active={amount.hasError} variant="error">
        {t(amount.errorMessage)}
      </InputHint>
    </div>
  );
};

const FeeSection = () => {
  const {
    fields: { account },
  } = useForm(formModel.form);

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
          onDepositChange={formModel.multisigDepositChanged}
        />
      )}

      <FeeWithLabel
        label={t('operation.networkFee')}
        asset={network.chain.assets[0]}
        fee={fee.toString()}
        isLoading={pendingFee}
      />

      {isXcm && xcmApi && xcmConfig && (
        <XcmFeeWithLabel
          api={xcmApi}
          config={xcmConfig}
          asset={network.asset}
          transaction={coreTx || fakeTx}
          onFeeChange={formModel.xcmFeeChanged}
          onFeeLoading={formModel.isXcmFeeLoadingChanged}
        />
      )}

      {nonNullable(deliveryFee) && <DeliveryFeeWithLabel fee={deliveryFee} asset={network.chain.assets[0]} />}
    </div>
  );
};

const AlertForDeliveryFee = () => {
  const initiator = useUnit(formModel.$initiator);

  const deliveryFee = useUnit(formModel.$deliveryFee);
  const accountBalance = useUnit(formModel.$initiatorBalance);
  const network = useUnit(formModel.$networkStore);
  const hasDeliveryError = useUnit(formModel.$hasDeliveryError);
  const asset = network?.chain.assets.at(0);

  if (!initiator || !asset || !network || !deliveryFee || !hasDeliveryError || !accountBalance) {
    return null;
  }

  const formattedFee = formatBalance(deliveryFee, asset.precision).value;
  const formattedBalance = formatBalance(accountBalance.native, asset.precision).value;

  return (
    <DeliveryFeeAlert
      address={toAddress(initiator.accountId, { prefix: network.chain.addressPrefix })}
      fee={formattedFee}
      balance={formattedBalance}
      symbol={asset.symbol}
      onClose={account.resetErrors}
    />
  );
};

const MyselfAccountModal = () => {
  const {
    fields: { destinationChain },
  } = useForm(formModel.form);

  const isXcm = useUnit(formModel.$isXcm);
  const network = useUnit(formModel.$networkStore);
  const destinationAccounts = useUnit(formModel.$destinationAccounts);
  const isMyselfXcmOpened = useUnit(formModel.$isMyselfXcmOpened);

  if (!isXcm || !network || !destinationChain.value || destinationAccounts.length === 0) {
    return null;
  }

  return (
    <AccountSelectModal
      isOpen={isMyselfXcmOpened}
      accounts={destinationAccounts}
      chain={destinationChain.value}
      onClose={formModel.xcmDestinationCancelled}
      onSelect={({ accountId }) => formModel.xcmDestinationSelected(accountId)}
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

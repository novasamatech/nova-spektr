import { BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { uniqBy } from 'lodash';
import { type FormEvent, memo, useEffect, useMemo, useState } from 'react';
import { Trans } from 'react-i18next';

import { TEST_IDS } from '@/shared/constants';
import { type ChainId, type Wallet } from '@/shared/core';
import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import {
  entries,
  formatAsset,
  fromPrecision,
  getNativeAsset,
  includesMultiple,
  nonNullable,
  nullable,
  performSearch,
  toAddress,
  validateAddress,
  withdrawableAmount,
} from '@/shared/lib/utils';
import { Alert, Button, CaptionText, FootnoteText, Icon, InputHint, Switch } from '@/shared/ui';
import {
  AccountSelect,
  Address,
  Identicon,
  SignatorySelect,
  TransactionValidationError,
  WalletIcon,
} from '@/shared/ui-entities';
import { Box, Combobox, Field, Select, Tooltip } from '@/shared/ui-kit';
import { accountService, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { ChainTitle } from '@/entities/chain';
import { contactModel } from '@/entities/contact';
import { DeliveryFeeWithLabel, FeeWithLabel, MultisigDepositWithLabel, XcmFeeWithLabel } from '@/entities/transaction';
import { AccountSelectModal, accountUtils, walletModel } from '@/entities/wallet';
import { AmountInput } from '@/features/assets-balances';
import { walletSelectFeature } from '@/features/wallet-select';
import { formModel } from '../model/form-model';

type Props = {
  onGoBack: () => void;
};

type ComboboxItem = {
  id: string;
  label: React.ReactNode;
  value: { address: string; walletId?: number };
};

type ComboboxGroup = {
  id: string;
  label: React.ReactNode;
  items: ComboboxItem[];
};

export const TransferForm = memo(({ onGoBack }: Props) => {
  const { submit } = useForm(formModel.form);
  const errors = useUnit(formModel.$errors);
  const canSubmit = useUnit(formModel.$canSubmit);
  const wallets = useUnit(walletModel.$wallets);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    if (canSubmit) {
      submit();
    }
  };

  return (
    <div className="flex flex-col gap-4 px-5 py-4">
      <TransactionValidationError errors={errors} wallets={wallets} />
      <DestinationBalanceAlert />
      <form id="transfer-form" className="flex flex-col gap-y-4" onSubmit={submitForm}>
        <XcmChainSelector />
        <InitiatorSelector />
        <SignatorySelector />
        <Destination />
        <Amount />
      </form>
      <div className="flex flex-col gap-y-6">
        <FeeSection />
      </div>

      <AlertForAccountDeath />

      <ActionsSection onGoBack={onGoBack} />

      <MyselfAccountModal />
    </div>
  );
});

const DestinationBalanceAlert = memo(() => {
  const { t } = useI18n();

  const destinationAsset = useUnit(formModel.$destinationAsset);
  const destinationBalanceEd = useUnit(formModel.$destinationBalanceEd);
  const hasDestinationBalanceError = useUnit(formModel.$hasDestinationBalanceError);

  return (
    <Alert title={t('transfer.destinationBalanceAlertTitle')} variant="error" active={hasDestinationBalanceError}>
      <span>
        <Trans
          t={t}
          i18nKey="transfer.destinationBalanceAlertDescription"
          values={{
            ed: destinationAsset && destinationBalanceEd ? formatAsset(destinationBalanceEd, destinationAsset) : '0',
          }}
          components={{ b: <b /> }}
        />
      </span>
    </Alert>
  );
});

const InitiatorSelector = memo(() => {
  const { t } = useI18n();

  const {
    fields: { initiator },
  } = useForm(formModel.form);

  const initiators = useUnit(formModel.$initiators);
  const network = useUnit(formModel.$networkStore);
  const balances = useUnit(balanceModel.$balanceMap);

  if (initiators.length < 2) {
    return null;
  }

  if (!network) {
    return null;
  }

  const asset = getNativeAsset(network.chain.assets);

  return (
    <Field text={t('operation.selectAccountLabel')}>
      <AccountSelect
        value={initiator.value}
        options={initiators}
        placeholder={t('operation.selectAccount')}
        invalid={initiator.hasError}
        chain={network.chain}
        asset={asset}
        balances={balances}
        balanceType="transferable"
        onChange={initiator.onChange}
      />
      <InputHint variant="error" active={initiator.hasError}>
        {t(initiator.errorMessage)}
      </InputHint>
    </Field>
  );
});

const SignatorySelector = memo(() => {
  const { t } = useI18n();

  const {
    fields: { signatory },
  } = useForm(formModel.form);

  const initiator = useUnit(formModel.form.fields.initiator.$value);
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
      return { account: signatory, balance: withdrawableAmount(balance) };
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
      allWallets={allWallets}
      initiator={initiator}
      hasError={signatory.hasError}
      errorText={t(signatory.errorMessage)}
      network={network}
      onChange={signatory.onChange}
    />
  );
});

const XcmChainSelector = memo(() => {
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
        testId={TEST_IDS.OPERATIONS.XCM_SELECTOR}
        onChange={selectChain}
      >
        <Select.Group title={t('transfer.onChainPlaceholder')}>
          <Select.Item value={nativeChain.chainId} itemTestId={TEST_IDS.MULTISIG.NETWORK_OPTION}>
            <ChainTitle chainId={nativeChain.chainId} fontClass="text-text-primary" />
          </Select.Item>
        </Select.Group>
        <Select.Group title={t('transfer.crossChainPlaceholder')}>
          {xcmChains.map((chain) => (
            <Select.Item key={chain.chainId} value={chain.chainId} itemTestId={TEST_IDS.MULTISIG.NETWORK_OPTION}>
              <ChainTitle chainId={chain.chainId} fontClass="text-text-primary" />
            </Select.Item>
          ))}
        </Select.Group>
      </Select>
    </Field>
  );
});

const { services, constants } = walletSelectFeature;

const Destination = memo(() => {
  const { t } = useI18n();

  const {
    fields: { initiator, destination, destinationChain },
  } = useForm(formModel.form);

  const contacts = useUnit(contactModel.$contacts);
  const wallets = useUnit(walletModel.$wallets);
  const accountsList = useUnit(walletModel.$availableAccounts);
  const network = useUnit(formModel.$networkStore);

  const walletsMap = useMemo(() => {
    return wallets.reduce<Record<number, Wallet>>((acc, wallet) => {
      acc[wallet.id] = wallet;
      return acc;
    }, {});
  }, [wallets]);

  const [query, setQuery] = useState('');

  const isMyselfXcmEnabled = useUnit(formModel.$isMyselfXcmEnabled);

  const filteredContacts = useMemo(() => {
    return performSearch({
      query,
      records: contacts,
      weights: { name: 1, address: 0.5 },
    });
  }, [query, contacts]);

  const chain = destinationChain.value ?? network?.chain;

  useEffect(() => {
    setQuery('');
  }, [chain]);

  const walletsOptions = useMemo<ComboboxGroup[]>(() => {
    if (nullable(chain)) return [];

    const filteredAccounts = accountsList.filter((account) => {
      const isChainMatch = accountService.isAccountAvailableOnChain(account, chain);
      const address = toAddress(account.accountId, { prefix: chain.addressPrefix });
      const queryPass = includesMultiple([account.name, address], query);
      const isMyself = nonNullable(initiator.value) && initiator.value.accountId === account.accountId;

      return isChainMatch && queryPass && !isMyself;
    });
    const uniqueAccounts = uniqBy(filteredAccounts, 'accountId');

    const accountByGroup = services.walletSelect.getWalletFamilyByAccounts(wallets, uniqueAccounts);
    const ownAccountOptions: ComboboxGroup[] = [];

    for (const [walletFamily, accountsGroup] of entries(accountByGroup)) {
      if (accountsGroup.length === 0) continue;

      const accountOptions: ComboboxItem[] = [];

      for (const account of accountsGroup) {
        const wallet = walletsMap[account.walletId];
        const address = toAddress(account.accountId, { prefix: chain.addressPrefix });

        const title = nonNullable(wallet)
          ? account.name === wallet.name
            ? account.name
            : `${account.name} (${wallet.name})`
          : account.name;

        accountOptions.push({
          id: address,
          value: { address, walletId: account.walletId },
          label: <Address showIcon title={title} address={address} />,
        });
      }

      ownAccountOptions.push({
        id: walletFamily,
        label: (
          <div className="flex items-center gap-x-2" key={walletFamily}>
            <WalletIcon type={walletFamily} />
            <CaptionText className="font-semibold text-text-secondary uppercase">
              {t(constants.GROUP_LABELS[walletFamily])}
            </CaptionText>
          </div>
        ),
        items: accountOptions,
      });
    }

    return ownAccountOptions;
  }, [query, chain, wallets, accountsList]);

  const contactOptions = useMemo<ComboboxGroup[]>(() => {
    if (validateAddress(query, chain)) return [];

    const addressOptions: ComboboxItem[] = [];
    for (const contact of filteredContacts) {
      const displayedAddress = toAddress(contact.accountId, { prefix: chain?.addressPrefix });
      const isValidAddress = validateAddress(displayedAddress, chain);

      if (!isValidAddress) continue;

      addressOptions.push({
        id: contact.id.toString(),
        label: <Address showIcon title={contact.name} address={displayedAddress} />,
        value: { address: displayedAddress },
      });
    }

    if (addressOptions.length === 0) return [];

    return [
      {
        id: 'contacts',
        label: t('createMultisigAccount.contactsGroup'),
        items: addressOptions,
      },
    ];
  }, [walletsOptions, query, chain, filteredContacts]);

  const options = [...walletsOptions, ...contactOptions];

  const prefixElement = (
    <Identicon
      invalid={destination.touched && destination.hasError}
      size={20}
      address={toAddress(destination.value, { prefix: chain?.addressPrefix })}
      background={false}
    />
  );

  const handleChange = () => {
    formModel.myselfClicked();
    setQuery('');
  };

  return (
    <Field text={t('transfer.recipientLabel')}>
      <Box direction="row" gap={2} horizontalAlign="center" verticalAlign="center">
        <Combobox
          data-testid={TEST_IDS.OPERATIONS.RECIPIENT_INPUT}
          placeholder={t('transfer.recipientPlaceholder')}
          invalid={destination.touched && destination.hasError}
          value={destination.value.trim()}
          prefixElement={prefixElement}
          height="md"
          onChange={destination.onChange}
          onBlur={destination.markAsTouched}
          onInput={setQuery}
        >
          {options.map((group) => (
            <Combobox.Group key={group.id} title={group.label}>
              {group.items.map((option) => (
                <Combobox.Item key={`${option.id}-${option.value.walletId ?? 'unknown'}`} value={option.value.address}>
                  {option.label}
                </Combobox.Item>
              ))}
            </Combobox.Group>
          ))}
        </Combobox>

        {isMyselfXcmEnabled && (
          <Button pallet="secondary" testId={TEST_IDS.OPERATIONS.MYSELF_BUTTON} onClick={handleChange}>
            {t('transfer.myselfButton')}
          </Button>
        )}
      </Box>

      <InputHint active={destination.touched && destination.hasError} variant="error">
        {t(destination.errorMessage, destination.errorValues)}
      </InputHint>
    </Field>
  );
});

const Amount = memo(() => {
  const { t } = useI18n();

  const {
    fields: { amount },
  } = useForm(formModel.form);

  const accountAvailableBalance = useUnit(formModel.$available);
  const network = useUnit(formModel.$networkStore);
  const isExistentialDepositEnabled = useUnit(formModel.$isExistentialDepositEnabled);

  const showMaxButton = accountAvailableBalance?.gtn(0) ?? false;
  const showEDSwitch = useUnit(formModel.$showEDSwitch);

  if (!network) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-2">
      <AmountInput
        invalid={amount.touched && amount.hasError}
        value={amount.value}
        balance={accountAvailableBalance?.toString() ?? null}
        balancePlaceholder={t('general.input.availableLabel')}
        placeholder={t('general.input.amountLabel')}
        asset={network.asset}
        suffixElement={
          showMaxButton && (
            <Button pallet="secondary" variant="fill" size="sm" onClick={() => formModel.events.toggleMaxMode(true)}>
              {t('transfer.max.buttonTitle')}
            </Button>
          )
        }
        testId={TEST_IDS.OPERATIONS.AMOUNT_INPUT}
        onChange={(value: string) => amount.onChange(value)}
        onBlur={amount.markAsTouched}
        onKeyDown={() => formModel.events.toggleMaxMode(false)}
      />
      <InputHint active={amount.touched && amount.hasError} variant="error">
        {t(amount.errorMessage)}
      </InputHint>
      {showEDSwitch && (
        <div className="flex justify-end">
          <Switch
            checked={isExistentialDepositEnabled}
            variant="accent"
            onChange={(checked) => formModel.events.toggleExistentialDeposit(checked)}
          >
            <div className="flex items-center gap-1">
              <Tooltip>
                <Tooltip.Trigger>
                  <div tabIndex={0}>
                    <Icon name="info" className="hover:text-icon-hover" size={16} />
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Content>{t('transfer.max.ed.tooltip')}</Tooltip.Content>
              </Tooltip>
              <FootnoteText>{t('transfer.max.ed.title')}</FootnoteText>
            </div>
          </Switch>
        </div>
      )}
    </div>
  );
});

const FeeSection = memo(() => {
  const { t } = useI18n();

  const initiator = useUnit(formModel.form.fields.initiator.$value);
  const api = useUnit(formModel.$api);
  const network = useUnit(formModel.$networkStore);
  const coreTx = useUnit(formModel.$coreTx);
  const feeTx = useUnit(formModel.$feeTx);
  const isXcm = useUnit(formModel.$isXcm);
  const xcmConfig = useUnit(formModel.$xcmConfig);
  const xcmApi = useUnit(formModel.$xcmApi);
  const fee = useUnit(formModel.$fee);
  const pendingFee = useUnit(formModel.$pendingFee);
  const deliveryFee = useUnit(formModel.$deliveryFee);

  if (!network) {
    return null;
  }

  const isMultisig = initiator && accountUtils.isAnyMultisigAccount(initiator);

  return (
    <div className="flex flex-col gap-y-2">
      {isMultisig && (
        <MultisigDepositWithLabel
          api={api}
          asset={getNativeAsset(network.chain.assets)}
          threshold={initiator.threshold || 1}
          onDepositChange={(deposit) => formModel.multisigDepositChanged(new BN(deposit))}
        />
      )}

      <FeeWithLabel
        label={t('operation.networkFee')}
        asset={getNativeAsset(network.chain.assets)!}
        fee={fee}
        isLoading={pendingFee}
      />

      {isXcm && xcmApi && xcmConfig && (
        <XcmFeeWithLabel
          api={xcmApi}
          config={xcmConfig}
          asset={network.asset}
          transaction={coreTx || feeTx}
          onFeeChange={formModel.xcmFeeChanged}
          onFeeLoading={formModel.isXcmFeeLoadingChanged}
        />
      )}

      {isXcm && <DeliveryFeeWithLabel fee={deliveryFee} asset={getNativeAsset(network.chain.assets)!} />}
    </div>
  );
});

const MyselfAccountModal = memo(() => {
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
});

const AlertForAccountDeath = memo(() => {
  const { t } = useI18n();
  const showAccountDeathAlert = useUnit(formModel.$showAccountDeathAlert);
  const initiatorAccountBalance = useUnit(formModel.$initiatorAccountBalance);
  const asset = useUnit(formModel.$asset);

  if (nullable(initiatorAccountBalance) || nullable(asset)) {
    return null;
  }

  return (
    showAccountDeathAlert && (
      <Alert title={t('transfer.accountDeathWarning.title')} variant="warn" active>
        <FootnoteText className="max-w-full text-text-primary">
          <Trans
            t={t}
            i18nKey="transfer.accountDeathWarning.description"
            components={{ b: <b className="font-semibold" /> }}
            values={{ ed: fromPrecision(initiatorAccountBalance.ed, asset.precision), asset: asset.symbol }}
          />
        </FootnoteText>
      </Alert>
    )
  );
});

const ActionsSection = memo(({ onGoBack }: Props) => {
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
});

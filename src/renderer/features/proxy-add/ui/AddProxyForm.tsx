import { useUnit } from 'effector-react';
import { uniqBy } from 'lodash';
import { type FormEvent, type ReactNode, memo, useEffect, useMemo, useState } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { type Address as AddressType, type Chain, type ChainId } from '@/shared/core';
import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import {
  entries,
  getNativeAsset,
  includesMultiple,
  nonNullable,
  performSearch,
  toAddress,
  toShortAddress,
  transferableAmount,
  validateAddress,
  withdrawableAmount,
} from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Alert, Button, CaptionText, InputHint } from '@/shared/ui';
import { Address, AssetBalance, Identicon, TransactionValidationError, WalletIcon } from '@/shared/ui-entities';
import { Combobox, Field, Select } from '@/shared/ui-kit';
import { accountService, useAccountName, useAccountsNames } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { ChainTitle } from '@/entities/chain';
import { contactModel } from '@/entities/contact';
import { ProxyPopover } from '@/entities/proxy';
import { transactionService } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
// eslint-disable-next-line boundaries/entry-point -- direct import to avoid circular: drafts → accounts-structure → wallet-details → proxy-add
import { InitiateDraftButton } from '@/features/drafts/components/InitiateDraftButton';
import { SigningPathSection } from '@/features/signing-path';
import { walletSelectFeature } from '@/features/wallet-select';
import { FeeWithLabel, MultisigDepositFee, ProxyDeposit, ProxyDepositLabel } from '@/widgets/transaction-fee';
import { addProxyModel } from '../model/add-proxy-model';
import { formModel } from '../model/form-model';

const { services, constants } = walletSelectFeature;

type DelegateComboboxItem = {
  id: string;
  label: ReactNode;
  value: { address: string; walletId?: number };
};

type DelegateComboboxGroup = {
  id: string;
  label: ReactNode;
  items: DelegateComboboxItem[];
};

const AccountAddressItem = memo(
  ({ accountId, chain, address }: { accountId: AccountId; chain: Chain; address: AddressType }) => {
    const resolvedName = useAccountName({ accountId, chain });
    return <Address showIcon title={resolvedName} address={address} />;
  },
);

export const AddProxyForm = () => {
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
      <ProxyPopover>{t('proxy.proxyTooltip')}</ProxyPopover>
      <form id="add-proxy-form" className="mt-4 flex flex-col gap-y-4" onSubmit={submitProxy}>
        <NetworkSelector />
        <AccountSelector />
        <Signatories />
        <ProxyInput />
        <ProxyTypeSelector />
      </form>
      <div className="flex flex-col gap-y-6 pt-6 pb-4">
        <FeeSection />
        <FeeError />
      </div>
      <ActionSection />
    </div>
  );
};

const NetworkSelector = () => {
  const { t } = useI18n();

  const {
    fields: { chain },
  } = useForm(formModel.form);

  const availableChains = useUnit(formModel.$availableChains);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setSearchQuery('');
  }, [chain.value?.chainId]);

  const filteredChains = useMemo(() => {
    if (!searchQuery) return availableChains;

    return performSearch({
      query: searchQuery,
      records: availableChains,
      weights: { name: 1, chainId: 0.5, specName: 0.5 },
    });
  }, [availableChains, searchQuery]);

  if (!chain.value) {
    return null;
  }

  const handleChange = (chainId: ChainId) => {
    const next = availableChains.find((c) => c.chainId === chainId);
    if (next) chain.onChange(next);
  };

  return (
    <Field text={t('proxy.addProxy.networkLabel')}>
      <Select
        placeholder={t('proxy.addProxy.networkPlaceholder')}
        value={chain.value.chainId}
        invalid={chain.hasError}
        height="sm"
        onChange={handleChange}
        onSearch={setSearchQuery}
      >
        {filteredChains.map((c) => (
          <Select.Item key={c.chainId} value={c.chainId}>
            <ChainTitle className="overflow-hidden" fontClass="text-text-primary truncate" chain={c} />
          </Select.Item>
        ))}
      </Select>
      <InputHint variant="error" active={chain.hasError}>
        {t(chain.errorMessage)}
      </InputHint>
    </Field>
  );
};

const AccountSelector = () => {
  const { t } = useI18n();

  const {
    fields: { initiator },
  } = useForm(formModel.form);

  const chain = useUnit(formModel.form.fields.chain.$value);
  const availableAccounts = useUnit(formModel.$availableAccounts);
  const wallet = useUnit(walletSelect.$selectedWallet);
  const balances = useUnit(balanceModel.$balanceMap);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setSearchQuery('');
  }, [chain?.chainId]);

  if (availableAccounts.length < 2 || walletUtils.isFlexibleMultisig(wallet) || !initiator.value || !chain) {
    return null;
  }

  const nativeAsset = getNativeAsset(chain.assets);

  const filteredAccounts = useMemo(() => {
    return performSearch({
      query: searchQuery,
      records: availableAccounts,
      getMeta: (account) => ({
        address: toAddress(account.accountId, { prefix: chain.addressPrefix }),
      }),
      weights: { name: 1, address: 0.5 },
    });
  }, [availableAccounts, chain.addressPrefix, searchQuery]);

  const handleChange = (id: string) => {
    const account = availableAccounts.find((a) => accountService.uniqId(a) === id);
    if (account) initiator.onChange(account);
  };

  const isSingleOption = availableAccounts.length === 1;

  return (
    <Field text={t('proxy.addProxy.accountLabel')}>
      <Select
        placeholder={t('proxy.addProxy.accountPlaceholder')}
        value={accountService.uniqId(initiator.value)}
        disabled={isSingleOption}
        height="sm"
        onChange={handleChange}
        onSearch={setSearchQuery}
      >
        {filteredAccounts.map((account) => {
          const isShard = accountUtils.isVaultShardAccount(account);
          const address = toAddress(account.accountId, { prefix: chain.addressPrefix });
          const id = accountService.uniqId(account);
          const balance = balanceUtils.getBalance(balances, account.accountId, chain.chainId, nativeAsset.assetId);
          const title = isShard ? toShortAddress(address, 16) : account.name || undefined;

          return (
            <Select.Item key={id} value={id}>
              <div className="flex h-9 max-h-9 min-h-9 w-full items-center justify-between gap-x-2 overflow-hidden">
                <div className="min-w-0 flex-1">
                  <Address
                    showIcon
                    iconSize={20}
                    canCopy={false}
                    address={address}
                    variant="short"
                    title={title}
                    hideAddress={Boolean(title)}
                  />
                </div>
                <AssetBalance
                  className="text-footnote leading-none text-text-primary"
                  value={transferableAmount(balance)}
                  asset={nativeAsset}
                />
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
      balanceExtractor={(b) => (b ? withdrawableAmount(b) : null)}
      onChange={formModel.signingPathChanged}
    />
  );
};

const ProxyInput = () => {
  const { t } = useI18n();

  const {
    fields: { delegate, chain, initiator },
  } = useForm(formModel.form);

  const proxyAccounts = useUnit(formModel.$proxyAccounts);
  const wallets = useUnit(walletModel.$wallets);
  const contacts = useUnit(contactModel.$contacts);

  const [query, setQuery] = useState('');

  useEffect(() => {
    setQuery('');
  }, [chain.value?.chainId]);

  if (!chain.value) return null;

  const selectedChain = chain.value;

  const filteredContacts = useMemo(() => {
    return performSearch({
      query,
      records: contacts,
      weights: { name: 1, address: 0.5 },
    });
  }, [query, contacts]);

  const resolvedAccounts = useAccountsNames(proxyAccounts, selectedChain);

  const walletsOptions = useMemo<DelegateComboboxGroup[]>(() => {
    const filteredAccounts = resolvedAccounts.filter((account) => {
      const address = toAddress(account.accountId, { prefix: selectedChain.addressPrefix });
      const queryPass = includesMultiple([account.name, address], query);
      const isInitiator = nonNullable(initiator.value) && initiator.value.accountId === account.accountId;

      return queryPass && !isInitiator;
    });
    const uniqueAccounts = uniqBy(filteredAccounts, 'accountId');

    const accountByGroup = services.walletSelect.getWalletFamilyByAccounts(wallets, uniqueAccounts);
    const ownAccountOptions: DelegateComboboxGroup[] = [];

    for (const [walletFamily, accountsGroup] of entries(accountByGroup)) {
      if (accountsGroup.length === 0) continue;

      const accountOptions: DelegateComboboxItem[] = [];

      for (const account of accountsGroup) {
        const address = toAddress(account.accountId, { prefix: selectedChain.addressPrefix });

        accountOptions.push({
          id: address,
          value: { address, walletId: account.walletId },
          label: <AccountAddressItem accountId={account.accountId} chain={selectedChain} address={address} />,
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
  }, [query, selectedChain, resolvedAccounts, wallets, initiator.value, t]);

  const contactOptions = useMemo<DelegateComboboxGroup[]>(() => {
    if (validateAddress(query, selectedChain)) return [];

    const addressOptions: DelegateComboboxItem[] = [];
    for (const contact of filteredContacts) {
      const displayedAddress = toAddress(contact.accountId, { prefix: selectedChain.addressPrefix });
      const isValidAddress = validateAddress(displayedAddress, selectedChain);

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
  }, [query, selectedChain, filteredContacts, t]);

  const options = [...walletsOptions, ...contactOptions];

  const prefixElement = (
    <Identicon
      invalid={delegate.touched && delegate.hasError}
      address={toAddress(delegate.value, { prefix: selectedChain.addressPrefix })}
      size={20}
      background={false}
      canCopy={false}
    />
  );

  return (
    <Field text={t('proxy.addProxy.delegateLabel')}>
      <Combobox
        data-testid={TEST_IDS.PROXY_FORM.ADDRESS_INPUT}
        placeholder={t('proxy.addProxy.delegatePlaceholder')}
        invalid={delegate.touched && delegate.hasError}
        value={delegate.value.trim()}
        prefixElement={prefixElement}
        height="sm"
        onChange={delegate.onChange}
        onBlur={delegate.markAsTouched}
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
      <InputHint variant="error" active={delegate.touched && delegate.hasError}>
        {t(delegate.errorMessage)}
      </InputHint>
    </Field>
  );
};

const ProxyTypeSelector = () => {
  const { t } = useI18n();

  const {
    fields: { proxyType },
  } = useForm(formModel.form);

  const proxyTypes = useUnit(formModel.$proxyTypes);
  const isChainConnected = useUnit(formModel.$isChainConnected);

  return (
    <Field text={t('proxy.addProxy.proxyTypeLabel')}>
      <Select
        placeholder={t('proxy.addProxy.proxyTypePlaceholder')}
        value={proxyType.value || null}
        invalid={proxyType.hasError}
        disabled={!isChainConnected}
        height="sm"
        onChange={(value) => {
          const next = proxyTypes.find((type) => type === value);
          if (next) proxyType.onChange(next);
        }}
      >
        {proxyTypes.map((type) => (
          <Select.Item key={type} value={type}>
            {type}
          </Select.Item>
        ))}
      </Select>
      <InputHint variant="error" active={proxyType.hasError}>
        {t(proxyType.errorMessage)}
      </InputHint>
    </Field>
  );
};

const FeeSection = () => {
  const {
    fields: { chain },
  } = useForm(formModel.form);

  const api = useUnit(formModel.$api);
  const fee = useUnit(formModel.$fee);
  const pendingFee = useUnit(formModel.$pendingFee);
  const isMultisig = useUnit(formModel.$isMultisig);
  const multisigDeposit = useUnit(formModel.$multisigDeposit);
  const oldProxyDeposit = useUnit(formModel.$oldProxyDeposit);
  const activeProxies = useUnit(formModel.$activeProxies);

  if (!chain.value) return null;

  const nativeAsset = getNativeAsset(chain.value.assets);

  return (
    <div className="flex flex-col gap-y-2">
      <ProxyDepositLabel>
        <ProxyDeposit
          api={api}
          deposit={oldProxyDeposit}
          proxyNumber={activeProxies.length + 1}
          asset={nativeAsset}
          onDepositChange={formModel.proxyDepositChanged}
          onDepositLoading={formModel.isProxyDepositLoadingChanged}
        />
      </ProxyDepositLabel>

      {isMultisig && <MultisigDepositFee asset={nativeAsset} multisigDeposit={multisigDeposit.toString()} />}

      <FeeWithLabel asset={nativeAsset} fee={fee} isLoading={pendingFee} />
    </div>
  );
};

const FeeError = () => {
  const { t } = useI18n();

  const {
    fields: { initiator },
  } = useForm(formModel.form);

  const isMultisig = useUnit(formModel.$isMultisig);

  return (
    <Alert title={t('proxy.addProxy.balanceAlertTitle')} active={initiator.hasError} variant="error">
      <Alert.Item withDot={false}>
        {isMultisig ? t('proxy.addProxy.balanceAlertMultisig') : t('proxy.addProxy.balanceAlertRegular')}
      </Alert.Item>
    </Alert>
  );
};

const ActionSection = () => {
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
        source="proxy-add"
        onDraftCreated={addProxyModel.output.flowFinished}
      />
      <Button form="add-proxy-form" type="submit" disabled={!canSubmit}>
        {t('operation.continueButton')}
      </Button>
    </div>
  );
};

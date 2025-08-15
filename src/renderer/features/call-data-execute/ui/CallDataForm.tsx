import * as Ariakit from '@ariakit/react';
import { BN_ZERO } from '@polkadot/util';
import * as RadixPopover from '@radix-ui/react-popover';
import { useUnit } from 'effector-react';
import { t } from 'i18next';
import { type FormEvent, type ReactNode, memo, startTransition, useMemo, useRef, useState } from 'react';

import { type Wallet, WalletType } from '@/shared/core';
import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import {
  cnTw,
  getNativeAsset,
  nonNullable,
  nullable,
  performSearch,
  toAddress,
  transferableAmountBN,
} from '@/shared/lib/utils';
import { Button, FootnoteText, Icon, InputHint, Separator, SmallTitleText } from '@/shared/ui';
import { Address, AssetBalance, ChainSelect } from '@/shared/ui-entities';
import { Box, Field, Input, Modal, ScrollArea, Select, Surface, ThemeProvider, useTheme } from '@/shared/ui-kit';
import { gridSpaceConverter } from '@/shared/ui-kit/_helpers/gridSpaceConverter';
import { accountService } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { Fee } from '@/entities/transaction';
import { WalletIcon, walletModel } from '@/entities/wallet';
import { formModel } from '../model/form';

import { JsonArgs } from './JsonArgs';

const walletTypesTitles: Record<WalletType, string> = {
  [WalletType.POLKADOT_EXTENSION]: t('wallets.polkadotExtensionLabel'),
  [WalletType.WATCH_ONLY]: t('wallets.watchOnlyLabel'),
  [WalletType.POLKADOT_VAULT]: t('wallets.paritySignerLabel'),
  [WalletType.MULTISIG]: t('wallets.multisigLabel'),
  [WalletType.FLEXIBLE_MULTISIG]: t('wallets.flexibleMultisigLabel'),
  [WalletType.WALLET_CONNECT]: t('wallets.walletConnectLabel'),
  [WalletType.NOVA_WALLET]: t('wallets.novaWalletLabel'),
  [WalletType.PROXIED]: t('wallets.proxiedLabel'),
  [WalletType.TALISMAN_EXTENSION]: t('wallets.talismanExtensionLabel'),
  [WalletType.SUBWALLET_EXTENSION]: t('wallets.subWalletExtensionLabel'),
  [WalletType.SINGLE_PARITY_SIGNER]: t('wallets.paritySignerLabel'),
};

export const CallDataForm = () => {
  const { t } = useI18n();
  const { submit } = useForm(formModel.form);
  const showSignatories = useUnit(formModel.$showSignatories);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const args = useUnit(formModel.$args);

  return (
    <>
      <form id="transfer-form" className="flex flex-col gap-y-4 px-5 pb-4" onSubmit={submitForm}>
        <NetworkSelect />
        <InitiatorSelect />
        {showSignatories && <SignatorySelect />}
        <CallDataInput />
      </form>

      <Separator />

      <ScrollArea>
        <Box padding={[4, 5]}>
          {nonNullable(args) && (
            <div className="flex flex-col gap-y-3">
              <SmallTitleText>{t('callData.isCorrect')}</SmallTitleText>
              <JsonArgs value={args} />
            </div>
          )}
          {nullable(args) && (
            <div className="flex flex-col items-center gap-y-2 px-10 py-20">
              <Icon size={64} name="empty" className="mb-4" />
              <SmallTitleText>{t('callData.noDecodedTxTitle')}</SmallTitleText>
              <FootnoteText className="text-text-tertiary">{t('callData.noDecodedTxDescription')}</FootnoteText>
            </div>
          )}
        </Box>
      </ScrollArea>

      <ActionsSection />
    </>
  );
};

const CallDataInput = () => {
  const { t } = useI18n();

  const {
    fields: { callData },
  } = useForm(formModel.form);

  return (
    <Field text={t('callData.callData')}>
      <Input height="md" value={callData.value} placeholder={t('callData.placeholder')} onChange={callData.onChange} />
      <InputHint variant="error" active={callData.hasError}>
        {t(callData.errorMessage)}
      </InputHint>
    </Field>
  );
};

const NetworkSelect = memo(() => {
  const { t } = useI18n();

  const allChains = useUnit(formModel.$allChains);
  const {
    fields: { chain },
  } = useForm(formModel.form);

  return (
    <Field text={t('callData.fields.network.label')}>
      <ChainSelect
        placeholder={t('callData.fields.network.placeholder')}
        value={chain.value}
        options={allChains}
        onChange={chain.onChange}
      />
      <InputHint variant="error" active={chain.hasError}>
        {t(chain.errorMessage)}
      </InputHint>
    </Field>
  );
});

const InitiatorSelect = memo(() => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);
  const allAccounts = useUnit(walletModel.$availableAccounts);
  const balances = useUnit(balanceModel.$balances);
  const chain = useUnit(formModel.form.fields.chain.$value);
  const {
    fields: { initiator },
  } = useForm(formModel.form);

  const [searchQuery, setSearchQuery] = useState('');
  const asset = chain ? getNativeAsset(chain.assets) : null;

  const onChange = (walletId: string) => {
    const wallet = wallets.find((w) => w.id === Number(walletId));
    if (nonNullable(wallet) && nonNullable(chain)) {
      const walletAccounts = accountService.filterAccountsByWallet(allAccounts, wallet.id);
      const matchingAccount = walletAccounts.find((account) =>
        accountService.isAccountAvailableOnChain(account, chain),
      );
      const accountToUse = matchingAccount ?? walletAccounts[0] ?? null;
      initiator.onChange(accountToUse);
    }
  };

  const options = useMemo(() => {
    const options: ReactNode[] = [];
    if (nullable(chain) || nullable(asset)) return options;

    // Filter wallets based on search query
    const filteredWallets = searchQuery
      ? performSearch({
          query: searchQuery.trim(),
          records: wallets,
          getMeta: (wallet) => ({
            name: wallet.name,
            allAddresses: accountService
              .filterAccountsByWallet(allAccounts, wallet.id)
              .map((account) => toAddress(account.accountId, { prefix: chain.addressPrefix }))
              .join(' '),
          }),
          weights: {
            name: 1,
            allAddresses: 0.8,
          },
        })
      : wallets;

    const walletsByType = filteredWallets.reduce(
      (groups, wallet) => {
        const walletAccounts = accountService.filterAccountsByWallet(allAccounts, wallet.id);
        const hasMatchingAccounts = walletAccounts.some((account) =>
          accountService.isAccountAvailableOnChain(account, chain),
        );

        if (!hasMatchingAccounts) return groups;

        if (!groups[wallet.type]) {
          groups[wallet.type] = { walletType: wallet.type, wallets: [] };
        }
        groups[wallet.type].wallets.push(wallet);
        return groups;
      },
      {} as Record<string, { walletType: WalletType; wallets: Wallet[] }>,
    );

    for (const walletGroup of Object.values(walletsByType)) {
      const walletTypeTitle = (
        <Box direction="row" gap={2} padding={[1, 0]} verticalAlign="center">
          <WalletIcon type={walletGroup.walletType} />
          <FootnoteText className="text-text-secondary uppercase">
            {t(walletTypesTitles[walletGroup.walletType])}
          </FootnoteText>
        </Box>
      );

      const walletItems = walletGroup.wallets
        .map((wallet) => {
          const walletAccounts = accountService.filterAccountsByWallet(allAccounts, wallet.id);
          const firstMatchingAccount = walletAccounts.find((account) =>
            accountService.isAccountAvailableOnChain(account, chain),
          );

          if (!firstMatchingAccount) return null;

          const balance = balanceUtils.getBalance(
            balances,
            firstMatchingAccount.accountId,
            chain.chainId,
            asset.assetId,
          );

          return (
            <SearchableSelectItem key={wallet.id} value={wallet.id.toString()}>
              <Box direction="row" verticalAlign="center" horizontalAlign="space-between" gap={2}>
                <Address
                  showIcon
                  canCopy={false}
                  variant="truncate"
                  title={wallet.name}
                  address={toAddress(firstMatchingAccount.accountId, { prefix: chain?.addressPrefix })}
                />
                <AssetBalance
                  className="text-footnote text-text-secondary"
                  value={transferableAmountBN(balance)}
                  asset={asset}
                />
              </Box>
            </SearchableSelectItem>
          );
        })
        .filter(nonNullable);

      if (walletItems.length > 0) {
        options.push(
          <SearchableSelectGroup key={walletGroup.walletType} title={walletTypeTitle}>
            {walletItems}
          </SearchableSelectGroup>,
        );
      }
    }

    return options;
  }, [wallets, balances, chain, asset, allAccounts, searchQuery]);

  const selectedWallet = useMemo(() => {
    if (initiator.value) {
      return wallets.find((w) => w.id === initiator.value?.walletId) ?? null;
    }
    return null;
  }, [wallets, initiator.value]);

  const balance = useMemo(() => {
    if (initiator.value && chain && asset) {
      const balance = balanceUtils.getBalance(balances, initiator.value.accountId, chain.chainId, asset.assetId);
      return transferableAmountBN(balance);
    }
    return BN_ZERO;
  }, [initiator.value, chain, asset, balances]);

  return (
    <Field text={t('callData.fields.initiator.label')}>
      <SearchableSelect
        placeholder={t('callData.fields.initiator.placeholder')}
        value={selectedWallet?.id.toString() ?? null}
        valueNode={
          nonNullable(initiator.value) && nonNullable(selectedWallet) ? (
            <Box direction="row" verticalAlign="center" horizontalAlign="space-between" gap={2}>
              <Address
                showIcon
                canCopy={false}
                variant="truncate"
                title={selectedWallet.name}
                address={toAddress(initiator.value.accountId, { prefix: chain?.addressPrefix })}
              />
              {nonNullable(asset) && (
                <AssetBalance className="text-footnote text-text-secondary" value={balance} asset={asset} />
              )}
            </Box>
          ) : null
        }
        height="md"
        onSearch={setSearchQuery}
        onChange={onChange}
      >
        {options}
      </SearchableSelect>
      <InputHint variant="error" active={initiator.hasError}>
        {t(initiator.errorMessage)}
      </InputHint>
    </Field>
  );
});

type SearchableSelectProps = {
  placeholder: string;
  value: string | null;
  valueNode: ReactNode;
  height: 'sm' | 'md';
  testId?: string;
  onSearch: (query: string) => void;
  onChange: (value: string) => void;
  children: ReactNode;
};

const SearchableSelect = ({
  placeholder,
  value: _value,
  valueNode,
  height,
  testId = 'SearchableSelect',
  onSearch,
  onChange,
  children,
}: SearchableSelectProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const comboboxRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInputMode, setIsInputMode] = useState(false);
  const { portalContainer } = useTheme();

  const handleContainerFocus = () => {
    if (!isInputMode) {
      setIsInputMode(true);
      setOpen(true);
      // Auto focus the input when switching to input mode
      setTimeout(() => {
        comboboxRef.current?.focus();
      }, 0);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding to allow item selection
    setTimeout(() => {
      setIsInputMode(false);
      setOpen(false);
      setSearchQuery('');
      onSearch('');
    }, 150);
  };

  const handleInputChange = (query: string) => {
    setSearchQuery(query);
    onSearch(query);
  };

  const handleItemSelect = (itemValue: string) => {
    startTransition(() => {
      onChange(itemValue);
      setIsInputMode(false);
      setOpen(false);
      setSearchQuery('');
      onSearch('');
    });
  };

  return (
    <ThemeProvider preferStaticContent>
      <RadixPopover.Root modal open={open} onOpenChange={setOpen}>
        <RadixPopover.Anchor asChild>
          <div ref={containerRef} className="w-full">
            {!isInputMode ? (
              <div
                className={cnTw(
                  'border-input flex w-full cursor-pointer items-center rounded-md border border-filter-border px-2 py-1 text-footnote',
                  'hover:bg-accent hover:text-accent-foreground',
                  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                )}
                tabIndex={0}
                onClick={handleContainerFocus}
                onFocus={handleContainerFocus}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleContainerFocus();
                  }
                }}
              >
                {valueNode || <span className="text-muted-foreground">{placeholder}</span>}
              </div>
            ) : (
              <Ariakit.ComboboxProvider
                open={open}
                setOpen={setOpen}
                value={searchQuery}
                defaultSelectedValue=""
                setValue={handleInputChange}
                setSelectedValue={handleItemSelect}
              >
                <Ariakit.Combobox
                  autoSelect
                  autoFocus
                  ref={comboboxRef}
                  placeholder={placeholder}
                  render={({ onChange, ...props }) => <Input {...props} height={height} onChangeEvent={onChange} />}
                  onBlur={handleInputBlur}
                />
              </Ariakit.ComboboxProvider>
            )}
          </div>
        </RadixPopover.Anchor>

        {open && containerRef.current && (
          <RadixPopover.Portal container={portalContainer}>
            <RadixPopover.Content
              asChild
              hideWhenDetached
              data-testid={testId}
              style={{ width: `${containerRef.current.getBoundingClientRect().width}px` }}
              collisionPadding={gridSpaceConverter(2)}
              sideOffset={gridSpaceConverter(2)}
              onOpenAutoFocus={(e) => e.preventDefault()}
              onInteractOutside={(event) => {
                const target = event.target as Element | null;
                const isCombobox = target === comboboxRef?.current;
                const inListbox = target && listboxRef?.current?.contains(target);
                if (isCombobox || inListbox) {
                  event.preventDefault();
                }
              }}
            >
              <Surface
                elevation={1}
                className={cnTw(
                  'z-50 flex h-max max-h-(--radix-popper-available-height) flex-col p-1',
                  'overflow-hidden duration-100 animate-in fade-in zoom-in-95',
                )}
              >
                <ScrollArea>
                  {isInputMode && (
                    <Ariakit.ComboboxProvider
                      open={open}
                      setOpen={setOpen}
                      value={searchQuery}
                      defaultSelectedValue=""
                      setValue={handleInputChange}
                      setSelectedValue={handleItemSelect}
                    >
                      <Ariakit.ComboboxList ref={listboxRef} role="listbox">
                        {children}
                      </Ariakit.ComboboxList>
                    </Ariakit.ComboboxProvider>
                  )}
                </ScrollArea>
              </Surface>
            </RadixPopover.Content>
          </RadixPopover.Portal>
        )}
      </RadixPopover.Root>
    </ThemeProvider>
  );
};

type SearchableSelectGroupProps = {
  title: ReactNode;
  children: ReactNode;
};

const SearchableSelectGroup = ({ title, children }: SearchableSelectGroupProps) => {
  return (
    <Ariakit.ComboboxGroup className="mb-1 last:mb-0">
      <Ariakit.ComboboxGroupLabel>
        <div className="mb-1 px-3 py-1 text-help-text text-text-secondary">{title}</div>
      </Ariakit.ComboboxGroupLabel>
      {children}
    </Ariakit.ComboboxGroup>
  );
};

type SearchableSelectItemProps = {
  value: string;
  children: ReactNode;
};

const SearchableSelectItem = ({ value, children }: SearchableSelectItemProps) => {
  return (
    <Ariakit.ComboboxItem
      focusOnHover
      value={value}
      className={cnTw(
        'flex cursor-pointer rounded-sm px-2 py-1 text-footnote text-text-secondary',
        'bg-block-background-default data-active-item:bg-block-background-hover',
        'mb-1 last:mb-0',
      )}
    >
      {children}
    </Ariakit.ComboboxItem>
  );
};

const SignatorySelect = memo(() => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);
  const signatories = useUnit(formModel.$signatories);
  const balances = useUnit(balanceModel.$balances);
  const chain = useUnit(formModel.form.fields.chain.$value);
  const {
    fields: { signatory },
  } = useForm(formModel.form);

  const asset = chain ? getNativeAsset(chain.assets) : null;

  const onChange = (walletId: string) => {
    const wallet = wallets.find((w) => w.id === Number(walletId));
    if (nonNullable(wallet) && nonNullable(chain)) {
      const walletSignatories = accountService.filterAccountsByWallet(signatories, wallet.id);
      const matchingSignatory = walletSignatories.find((account) =>
        accountService.isAccountAvailableOnChain(account, chain),
      );
      if (matchingSignatory) {
        signatory.onChange(matchingSignatory);
      }
    }
  };

  const options = useMemo(() => {
    const options: ReactNode[] = [];
    if (nullable(chain) || nullable(asset)) return options;

    const walletsByType = wallets.reduce(
      (groups, wallet) => {
        const walletSignatories = accountService.filterAccountsByWallet(signatories, wallet.id);
        const hasMatchingSignatories = walletSignatories.some((account) =>
          accountService.isAccountAvailableOnChain(account, chain),
        );
        if (!hasMatchingSignatories) return groups;

        if (!groups[wallet.type]) {
          groups[wallet.type] = { walletType: wallet.type, wallets: [] };
        }
        groups[wallet.type].wallets.push(wallet);
        return groups;
      },
      {} as Record<string, { walletType: WalletType; wallets: Wallet[] }>,
    );

    for (const walletGroup of Object.values(walletsByType)) {
      const walletTypeTitle = (
        <Box direction="row" gap={2} padding={[1, 0]} verticalAlign="center">
          <WalletIcon type={walletGroup.walletType} />
          <FootnoteText className="text-text-secondary uppercase">
            {walletTypesTitles[walletGroup.walletType]}
          </FootnoteText>
        </Box>
      );

      const walletItems = walletGroup.wallets
        .map((wallet) => {
          const walletSignatories = accountService.filterAccountsByWallet(signatories, wallet.id);
          const firstMatchingSignatory = walletSignatories.find((account) =>
            accountService.isAccountAvailableOnChain(account, chain),
          );

          if (!firstMatchingSignatory) return null;

          const balance = balanceUtils.getBalance(
            balances,
            firstMatchingSignatory.accountId,
            chain.chainId,
            asset.assetId,
          );

          return (
            <Select.Item key={wallet.id} value={wallet.id.toString()} depth={1}>
              <Box direction="row" verticalAlign="center" horizontalAlign="space-between" gap={2}>
                <Address
                  showIcon
                  canCopy={false}
                  variant="truncate"
                  title={wallet.name}
                  address={toAddress(firstMatchingSignatory.accountId, { prefix: chain?.addressPrefix })}
                />
                <AssetBalance
                  className="text-footnote text-text-secondary"
                  value={transferableAmountBN(balance)}
                  asset={asset}
                />
              </Box>
            </Select.Item>
          );
        })
        .filter(Boolean);

      if (walletItems.length > 0) {
        options.push(
          <Select.Group key={walletGroup.walletType} title={walletTypeTitle}>
            {walletItems}
          </Select.Group>,
        );
      }
    }

    return options;
  }, [wallets, balances, chain, asset, signatories]);

  const selectedSignatoryWallet = useMemo(() => {
    if (signatory.value) {
      return wallets.find((w) => w.id === signatory.value?.walletId) ?? null;
    }
    return null;
  }, [wallets, signatory.value]);

  const signatoryBalance = useMemo(() => {
    if (signatory.value && chain && asset) {
      const balance = balanceUtils.getBalance(balances, signatory.value.accountId, chain.chainId, asset.assetId);
      return transferableAmountBN(balance);
    }
    return BN_ZERO;
  }, [signatory.value, chain, asset, balances]);

  return (
    <Field text={t('callData.fields.signatory.label')}>
      <Select
        placeholder={t('callData.fields.signatory.placeholder')}
        value={selectedSignatoryWallet?.id.toString() ?? null}
        valueNode={
          nonNullable(signatory.value) && nonNullable(selectedSignatoryWallet) ? (
            <Box direction="row" verticalAlign="center" horizontalAlign="space-between" gap={2}>
              <Address
                showIcon
                canCopy={false}
                variant="truncate"
                title={selectedSignatoryWallet.name}
                address={toAddress(signatory.value.accountId, { prefix: chain?.addressPrefix })}
              />
              {nonNullable(asset) && (
                <AssetBalance className="text-footnote text-text-secondary" value={signatoryBalance} asset={asset} />
              )}
            </Box>
          ) : null
        }
        height="md"
        onChange={onChange}
      >
        {options}
      </Select>
      <InputHint variant="error" active={signatory.hasError}>
        {t(signatory.errorMessage)}
      </InputHint>
    </Field>
  );
});

const ActionsSection = () => {
  const { t } = useI18n();

  const canSubmit = useUnit(formModel.$canSubmit);
  const extrinsic = useUnit(formModel.$extrinsic);
  const fee = useUnit(formModel.$fee);
  const pendingFee = useUnit(formModel.$pendingFee);
  const chain = useUnit(formModel.form.fields.chain.$value);
  const asset = chain ? getNativeAsset(chain.assets) : null;

  return (
    <Modal.Footer>
      {nonNullable(asset) && nonNullable(extrinsic) && (
        <Box direction="row" gap={2} verticalAlign="center">
          <FootnoteText className="text-text-tertiary">{t('operation.networkFee')}</FootnoteText>
          <Fee className="text-footnote" fee={fee} isLoading={pendingFee} asset={asset} hideFiat />
        </Box>
      )}

      <Button form="transfer-form" type="submit" disabled={!canSubmit}>
        {t('transfer.continueButton')}
      </Button>
    </Modal.Footer>
  );
};

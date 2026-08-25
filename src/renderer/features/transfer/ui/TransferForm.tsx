import { BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { type FormEvent, memo, useCallback, useMemo, useState } from 'react';
import { Trans } from 'react-i18next';

import { TEST_IDS } from '@/shared/constants';
import { type Asset, type ChainId } from '@/shared/core';
import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import {
  formatAsset,
  fromPrecision,
  getNativeAsset,
  nullable,
  performSearch,
  toAccountId,
  toAddress,
  toShortAddress,
  validateAddress,
  withdrawableAmount,
} from '@/shared/lib/utils';
import { Alert, Button, FootnoteText, Icon, IconButton, InputHint, Switch } from '@/shared/ui';
import {
  AccountSelect,
  Address,
  Identicon,
  TransactionValidationError,
  UnknownRecipientAckBox,
  WalletIcon,
} from '@/shared/ui-entities';
import { Box, Field, Select, Tooltip } from '@/shared/ui-kit';
import { accountService, useAccountName, useAccountsNames, useWalletName } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { ChainTitle } from '@/entities/chain';
import { AccountSelectModal, accountUtils, walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { AmountInput } from '@/features/assets-balances';
import { DraftFormBody, DraftModeCard, DraftSigningPath } from '@/features/drafts';
import { SigningPathSection, graphModel } from '@/features/signing-path';
import { NamedAccount } from '@/widgets/NameResolver';
import { RecipientCombobox } from '@/widgets/RecipientPicker';
import { FeeWithLabel, MultisigDepositWithLabel } from '@/widgets/transaction-fee';
import { TRANSFER_ALLOWED_PROXY_TYPES, formModel } from '../model/form-model';
import { xcmSpellTransferModel } from '../model/xcm-spell-transfer-model';

import { TokenSelectorModal } from './TokenSelector';

type Props = {
  onGoBack: () => void;
};

export const TransferForm = memo(({ onGoBack }: Props) => {
  const { submit } = useForm(formModel.form);
  const errors = useUnit(formModel.$errors);
  const canSubmit = useUnit(formModel.$canSubmit);
  const wallets = useUnit(walletModel.$wallets);
  const isTokenSelectorOpen = useUnit(formModel.$isTokenSelectorOpen);
  const isDraftMode = useUnit(formModel.$isDraftMode);
  const network = useUnit(formModel.$networkStore);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    if (canSubmit) {
      submit();
    }
  };

  const handleAssetSelect = useCallback((asset: Asset) => {
    formModel.assetChanged(asset);
  }, []);

  return (
    <div className="flex flex-col gap-4 px-5 py-4">
      <DraftModeCard isOn={isDraftMode} onToggle={formModel.events.toggleDraftMode} />
      {isDraftMode && network && (
        <DraftSigningPath
          chainId={network.chain.chainId}
          asset={network.asset}
          $draftPath={formModel.$draftSigningPath}
          draftPathCommitted={formModel.events.draftPathCommitted}
          draftPathEditStarted={formModel.events.draftPathEditStarted}
          draftPathEditEnded={formModel.events.draftPathEditEnded}
          allowedProxyTypes={TRANSFER_ALLOWED_PROXY_TYPES}
        />
      )}
      <DraftFormBody $isDraftMode={formModel.$isDraftMode} $isDraftPathComplete={formModel.$isDraftPathComplete}>
        <div className="flex flex-col gap-4">
          {!isDraftMode && <TransactionValidationError errors={errors} wallets={wallets} />}
          {!isDraftMode && <DestinationBalanceAlert />}
          {!isDraftMode && <PureProxyChainMismatchAlert />}
          <form id="transfer-form" className="flex flex-col gap-y-4" onSubmit={submitForm}>
            <ChainSelector />
            <XcmChainSelector />
            <InitiatorSelector />
            <SignatorySelector />
            <Destination />
            <Amount />
          </form>
          {!isDraftMode && <UnknownRecipientSection />}
          {!isDraftMode && (
            <div className="flex flex-col gap-y-6">
              <FeeSection />
            </div>
          )}
          {!isDraftMode && <AlertForAccountDeath />}
        </div>
      </DraftFormBody>

      <ActionsSection onGoBack={onGoBack} />

      <MyselfAccountModal />

      {network && (
        <TokenSelectorModal
          isOpen={isTokenSelectorOpen}
          chain={network.chain}
          onSelect={handleAssetSelect}
          onClose={() => formModel.hideTokenSelector()}
        />
      )}
    </div>
  );
});

const UnknownRecipientSection = memo(() => {
  const warning = useUnit(formModel.$recipientWarning);
  const isAcknowledged = useUnit(formModel.$isRiskAcknowledged);

  return (
    <UnknownRecipientAckBox
      warning={warning}
      context="transfer"
      checked={isAcknowledged}
      onToggle={formModel.events.riskAcknowledgedToggled}
    />
  );
});

const DestinationBalanceAlert = memo(() => {
  const { t } = useI18n();

  const destinationAsset = useUnit(formModel.$destinationAsset);
  const destinationBalanceEd = useUnit(formModel.$destinationBalanceEd);
  const hasDestinationBalanceError = useUnit(formModel.$hasDestinationBalanceError);

  return (
    <Alert title={t('transfer.destinationBalanceAlertTitle')} variant="error" active={hasDestinationBalanceError}>
      <span data-testid={TEST_IDS.VALIDATIONS.INACTIVE_ACCOUNT}>
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

const PureProxyChainMismatchAlert = memo(() => {
  const { t } = useI18n();
  const isPureProxyChainMismatch = useUnit(formModel.$isPureProxyChainMismatch);
  const proxyChain = useUnit(formModel.$proxyChain);

  const chainBadge = proxyChain ? (
    <ChainTitle
      chain={proxyChain}
      as="span"
      className="inline-flex"
      fontClass="font-bold text-text-primary"
      iconSize={14}
    />
  ) : (
    <div />
  );

  return (
    <Alert title={t('transfer.pureProxyChainMismatch.title')} variant="error" active={isPureProxyChainMismatch}>
      <FootnoteText className="text-text-primary">
        <Trans
          t={t}
          i18nKey="transfer.pureProxyChainMismatch.description"
          components={{ chains: chainBadge, br: <br /> }}
        />
      </FootnoteText>
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
  const isDraftMode = useUnit(formModel.$isDraftMode);

  // In draft mode the source is picked inside <StepPath> (rendered by
  // SignatorySelector below), not via the wallet-account dropdown.
  if (isDraftMode) return null;

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
  const signingPath = useUnit(formModel.$signingPath);
  const network = useUnit(formModel.$networkStore);
  const selectedWallet = useUnit(walletSelect.$selectedWallet);
  const errors = useUnit(formModel.$errors);
  const isDraftMode = useUnit(formModel.$isDraftMode);

  if (!network) return null;
  if (isDraftMode) return null;

  if (!initiator) {
    return (
      <Alert active title={t('operation.noSignatoryErrorTitle', { network: network.chain.name })} variant="error">
        <FootnoteText className="max-w-full tracking-tight text-text-secondary">
          <Trans
            t={t}
            i18nKey="operation.noSignatoryErrorDescription"
            parent="span"
            data-testid={TEST_IDS.VALIDATIONS.MISSING_ACCOUNT}
            values={{ network: network.chain.name }}
            components={{
              wallet: (
                <span className="mx-1 inline-flex max-w-[200px] items-center gap-x-1 align-bottom">
                  {selectedWallet && <WalletIcon type={selectedWallet.type} size={16} />}
                  <FootnoteText as="span" className="truncate text-text-secondary transition-colors">
                    {selectedWallet?.name}
                  </FootnoteText>
                </span>
              ),
            }}
          />
        </FootnoteText>
      </Alert>
    );
  }

  return (
    <SigningPathSection
      signingPath={signingPath}
      chain={network.chain}
      asset={network.asset}
      txErrors={errors}
      errorText={t(signatory.errorMessage)}
      allowedProxyTypes={TRANSFER_ALLOWED_PROXY_TYPES}
      disabledProxyReason={t('signingPath.transferProxyTypeDisabled')}
      balanceExtractor={(b) => (b ? withdrawableAmount(b) : null)}
      onChange={formModel.signingPathChanged}
    />
  );
});

const ChainSelector = memo(() => {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');

  const network = useUnit(formModel.$networkStore);
  const availableChains = useUnit(formModel.$availableChains);
  const isAssetPredefined = useUnit(formModel.$isAssetPredefined);

  const filteredChains = useMemo(() => {
    if (!searchQuery) return availableChains;

    return performSearch({
      query: searchQuery,
      records: availableChains,
      weights: { name: 1 },
    });
  }, [availableChains, searchQuery]);

  if (isAssetPredefined || !network) {
    return null;
  }

  const selectChain = (chainId: ChainId) => {
    const chain = availableChains.find((chain) => chain.chainId === chainId);
    if (!chain || chain.chainId === network.chain.chainId) return;

    formModel.chainChanged(chain);
  };

  return (
    <Field text={t('transfer.networkLabel')}>
      <Select
        placeholder={t('transfer.networkPlaceholder')}
        value={network.chain.chainId}
        testId={TEST_IDS.OPERATIONS.XCM_SELECTOR}
        onChange={selectChain}
        onSearch={setSearchQuery}
      >
        {filteredChains.map((chain) => (
          <Select.Item key={chain.chainId} value={chain.chainId} itemTestId={TEST_IDS.MULTISIG.NETWORK_OPTION}>
            <ChainTitle chainId={chain.chainId} fontClass="text-text-primary" />
          </Select.Item>
        ))}
      </Select>
    </Field>
  );
});

const XcmChainSelector = memo(() => {
  const { t } = useI18n();

  const {
    fields: { destinationChain },
  } = useForm(formModel.form);

  const network = useUnit(formModel.$networkStore);
  const destinationChains = useUnit(formModel.$destinationChains);
  const isXcmEnabled = useUnit(formModel.$isXcmEnabled);

  if (!isXcmEnabled || destinationChains.length <= 1 || !network) {
    return null;
  }

  const selectChain = (chainId: ChainId) => {
    const chain = destinationChains.find((chain) => chain.chainId === chainId);
    if (!chain) return;

    destinationChain.onChange(chain);
  };

  const [nativeChain, ...xcmChains] = destinationChains;

  return (
    <Field text={t('transfer.destinationChainLabel')}>
      <Select
        placeholder={t('transfer.destinationChainPlaceholder')}
        value={destinationChain.value?.chainId ?? null}
        testId={TEST_IDS.OPERATIONS.XCM_SELECTOR}
        onChange={selectChain}
      >
        {nativeChain && (
          <Select.Group title={t('transfer.onChainPlaceholder')}>
            <Select.Item value={nativeChain.chainId} itemTestId={TEST_IDS.MULTISIG.NETWORK_OPTION}>
              <ChainTitle chainId={nativeChain.chainId} fontClass="text-text-primary" />
            </Select.Item>
          </Select.Group>
        )}
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

const Destination = memo(() => {
  const { t } = useI18n();

  const {
    fields: { initiator, destination, destinationChain },
  } = useForm(formModel.form);

  const wallets = useUnit(walletModel.$wallets);
  const accountsList = useUnit(walletModel.$availableAccounts);
  const network = useUnit(formModel.$networkStore);
  const isDestinationReadonly = useUnit(formModel.$isDestinationReadonly);

  // Keep the editable Combobox mounted while the field is focused; only swap to
  // the read-only name card once the recipient is committed (blur/selection).
  // Swapping on raw value validity yanks focus mid-typing/paste and blocks edits.
  const [isRecipientFocused, setRecipientFocused] = useState(false);
  // Pulls focus into the Combobox the next time it mounts (after clear or when
  // re-entering edit from the card), so the user doesn't have to click again.
  const [autoFocusRecipient, setAutoFocusRecipient] = useState(false);

  const isMyselfXcmEnabled = useUnit(formModel.$isMyselfXcmEnabled);

  const chain = destinationChain.value ?? network?.chain;

  const resolvedAccounts = useAccountsNames(accountsList, chain);

  const recipientAccountId = useMemo(() => {
    const trimmed = destination.value.trim();
    if (!chain || !validateAddress(trimmed, chain)) return null;

    return toAccountId(trimmed);
  }, [destination.value, chain]);

  // Prefer the recipient's own resolved account name over the wallet name:
  // accountId-based resolution never sees the account object, so a key-set
  // vault recipient would show the wallet name instead of the key name the
  // dropdown and account selector display (`resolvedAccounts` runs the same
  // resolution the dropdown items use). `findRelatedAccount` disambiguates
  // when the same accountId exists in several wallets (chain match, then
  // custom-named), so the badge/name don't come from an arbitrary wallet.
  const recipientAccount = useMemo(() => {
    if (nullable(recipientAccountId)) return null;

    return accountService.findRelatedAccount(resolvedAccounts, recipientAccountId, chain) ?? null;
  }, [resolvedAccounts, recipientAccountId, chain]);

  // Derived from the account's walletId (not an independent lookup) so the
  // displayed name and the wallet badge always come from the same wallet when
  // several wallets hold the same accountId.
  const recipientWallet = useMemo(() => {
    if (nullable(recipientAccount)) return null;

    return wallets.find((wallet) => wallet.id === recipientAccount.walletId) ?? null;
  }, [wallets, recipientAccount]);

  // Run the standard resolution chain (custom name → contact → on-chain identity
  // → wallet name). `resolveAccountName` falls back to a short address when none
  // match, so we render the rich NamedAccount only when resolution produced a
  // real name — otherwise NamedAccount would print the address twice.
  const recipientWalletName = useWalletName(recipientWallet);
  const recipientName = useAccountName({
    accountId: recipientAccountId,
    chain,
    title: recipientAccount?.name ?? recipientWalletName ?? undefined,
  });
  const recipientHasName = useMemo(() => {
    if (nullable(recipientAccountId) || !recipientName) return false;

    const shortAddress = toShortAddress(toAddress(recipientAccountId, { prefix: chain?.addressPrefix }), 5);

    return recipientName !== shortAddress;
  }, [recipientAccountId, recipientName, chain]);

  const handleChange = () => {
    formModel.myselfClicked();
  };

  const handleClearRecipient = () => {
    destination.onChange('');
    destination.markAsTouched();
    // The card unmounts and the Combobox remounts; ask it to grab focus so the
    // user can immediately retype instead of clicking the field again.
    setAutoFocusRecipient(true);
  };

  // Return to the editable Combobox with the value intact so a committed
  // recipient can be edited in place instead of cleared and retyped.
  const handleEditRecipient = () => {
    if (isDestinationReadonly) return;

    setRecipientFocused(true);
    setAutoFocusRecipient(true);
  };

  const prefixElement = (
    <Identicon
      invalid={destination.touched && destination.hasError}
      size={20}
      address={toAddress(destination.value, { prefix: chain?.addressPrefix })}
      background={false}
    />
  );

  return (
    <Field text={t('transfer.recipientLabel')}>
      <Box direction="row" gap={2} horizontalAlign="center" verticalAlign="center">
        {recipientAccountId && !isRecipientFocused ? (
          <div
            data-testid={TEST_IDS.OPERATIONS.RECIPIENT_CARD}
            className="flex h-[42px] w-full items-center gap-x-2 rounded-sm border border-filter-border bg-input-background px-[11px]"
          >
            <button
              type="button"
              className="min-w-0 flex-1 cursor-text text-left"
              disabled={isDestinationReadonly}
              onClick={handleEditRecipient}
            >
              {recipientHasName ? (
                <NamedAccount
                  accountId={recipientAccountId}
                  chain={chain}
                  title={recipientAccount?.name}
                  wallet={recipientWallet}
                  variant="truncate"
                  iconSize={20}
                  hideExplorers
                />
              ) : (
                <Address
                  showIcon
                  iconSize={20}
                  variant="truncate"
                  address={toAddress(recipientAccountId, { prefix: chain?.addressPrefix })}
                />
              )}
            </button>
            {!isDestinationReadonly && (
              <IconButton
                name="close"
                size={16}
                testId={TEST_IDS.OPERATIONS.RECIPIENT_CLEAR}
                onClick={handleClearRecipient}
              />
            )}
          </div>
        ) : (
          <RecipientCombobox
            data-testid={TEST_IDS.OPERATIONS.RECIPIENT_INPUT}
            chain={chain}
            excludeAccountId={initiator.value?.accountId ?? null}
            placeholder={t('transfer.recipientPlaceholder')}
            invalid={destination.touched && destination.hasError}
            disabled={isDestinationReadonly}
            value={destination.value.trim()}
            prefixElement={prefixElement}
            height="md"
            autoFocus={autoFocusRecipient}
            onChange={destination.onChange}
            onFocus={() => {
              setRecipientFocused(true);
              setAutoFocusRecipient(false);
            }}
            onBlur={() => {
              setRecipientFocused(false);
              destination.markAsTouched();
            }}
          />
        )}
        {isMyselfXcmEnabled && !isDestinationReadonly && (
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
  const isXcm = useUnit(formModel.$isXcm);

  const showMaxButton = !isXcm && (accountAvailableBalance?.gtn(0) ?? false);
  const showEDSwitch = useUnit(formModel.$showEDSwitch);

  if (!network) {
    return null;
  }

  const handleAssetClick = () => formModel.showTokenSelector();

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
        onAssetClick={handleAssetClick}
        onBlur={amount.markAsTouched}
        onChange={(value: string) => amount.onChange(value)}
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
  const isXcm = useUnit(formModel.$isXcm);
  const fee = useUnit(formModel.$fee);
  const pendingFee = useUnit(formModel.$pendingFee);
  const originFee = useUnit(formModel.$originFee);
  const destinationFee = useUnit(formModel.$destinationFee);
  const isDestinationFeeLoading = useUnit(xcmSpellTransferModel.$isDestinationFeeLoading);
  const shouldShowFees = useUnit(xcmSpellTransferModel.$shouldShowFees);
  const signingPath = useUnit(formModel.$signingPath);
  const multisigByAccountId = useUnit(graphModel.$multisigByAccountId);

  if (!network) {
    return null;
  }

  // Resolve the multisig threshold from the path: a proxied → multisig →
  // signer flow keeps the multisig in the middle of the path, not on the
  // initiator (which is the proxied source). Without this lookup the deposit
  // line goes missing whenever the user signs through a proxy.
  const pathMultisigNode = signingPath.find((n) => n.kind === 'multisig');
  const pathMultisigInfo = pathMultisigNode ? multisigByAccountId.get(pathMultisigNode.accountId) : null;

  const initiatorThreshold = initiator && accountUtils.isAnyMultisigAccount(initiator) ? initiator.threshold : 0;
  const isMultisig = initiatorThreshold > 0 || pathMultisigInfo !== null;
  const threshold = pathMultisigInfo?.threshold ?? initiatorThreshold;
  const nativeAsset = getNativeAsset(network.chain.assets)!;

  return (
    <div className="flex flex-col gap-y-2">
      {isMultisig && (
        <MultisigDepositWithLabel
          api={api}
          asset={nativeAsset}
          threshold={threshold || 1}
          onDepositChange={(deposit) => formModel.multisigDepositChanged(new BN(deposit))}
        />
      )}

      {isXcm ? (
        shouldShowFees ? (
          <>
            {(() => {
              const originFeeAvailable = originFee !== null;
              const destinationFeeAvailable = destinationFee !== null;

              const showOriginFee =
                originFeeAvailable || (!originFeeAvailable && !destinationFeeAvailable && isDestinationFeeLoading);
              const showDestinationFee =
                destinationFeeAvailable || (!destinationFeeAvailable && !originFeeAvailable && isDestinationFeeLoading);

              const originFeeLoading = isDestinationFeeLoading;
              const destinationFeeLoading = isDestinationFeeLoading;

              return (
                <>
                  {showOriginFee ? (
                    <FeeWithLabel
                      label={t('operation.originNetworkFee')}
                      asset={nativeAsset}
                      fee={originFee}
                      isLoading={originFeeLoading}
                    />
                  ) : null}
                  {showDestinationFee ? (
                    <FeeWithLabel
                      label={t('operation.destinationNetworkFee')}
                      asset={nativeAsset}
                      fee={destinationFee}
                      isLoading={destinationFeeLoading}
                    />
                  ) : null}
                </>
              );
            })()}
          </>
        ) : null
      ) : (
        <FeeWithLabel label={t('operation.networkFee')} asset={nativeAsset} fee={fee} isLoading={pendingFee} />
      )}
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
  const canSaveAsDraft = useUnit(formModel.$canSaveAsDraft);
  const isPreparingTransaction = useUnit(formModel.$isPreparingTransaction);
  const errors = useUnit(formModel.$errors);
  const isDraftMode = useUnit(formModel.$isDraftMode);
  const hasErrors = errors.length > 0;
  const isLoading = isPreparingTransaction && !hasErrors;

  const isDisabled = isDraftMode ? !canSaveAsDraft : !canSubmit || hasErrors;

  return (
    <div className="mt-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Button variant="text" onClick={onGoBack}>
          {t('operation.goBackButton')}
        </Button>
        <div className="flex items-center gap-3">
          <Button
            form={isDraftMode ? undefined : 'transfer-form'}
            type={isDraftMode ? 'button' : 'submit'}
            disabled={isDisabled}
            isLoading={!isDraftMode && isLoading}
            onClick={isDraftMode ? () => formModel.events.saveAsDraftRequested() : undefined}
          >
            {isDraftMode ? t('operations.drafts.initiateButton') : t('transfer.continueButton')}
          </Button>
        </div>
      </div>
    </div>
  );
});

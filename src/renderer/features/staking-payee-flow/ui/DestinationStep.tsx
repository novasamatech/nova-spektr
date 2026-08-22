import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable, performSearch, toAddress } from '@/shared/lib/utils';
import { Alert, Button, Combobox, FootnoteText, InputHint, RadioGroup } from '@/shared/ui';
import { type RadioOption } from '@/shared/ui/types';
import { ChainIcon, Identicon, TransactionValidationError } from '@/shared/ui-entities';
import { Modal, ScrollArea } from '@/shared/ui-kit';
import { useAccountsNames, useWalletsNames } from '@/domains/network';
import { walletModel, walletUtils } from '@/entities/wallet';
import { DraftFormBody, DraftModeCard, DraftSigningPath } from '@/features/drafts';
import { SigningPathSection } from '@/features/signing-path';
import { NamedAccount } from '@/widgets/NameResolver';
import { payeeFlowModel } from '../model/payee-flow';
import { type PayeeOption } from '../types';

/**
 * The one question this flow asks: restake, or pay out to which account.
 *
 * Same frame as the amount flow's form — account and network chips, the draft
 * toggle, the signing route — with the amount field swapped for a radio pair.
 */
export const DestinationStep = () => {
  const { t } = useI18n();

  const chain = useUnit(payeeFlowModel.$chain);
  const asset = useUnit(payeeFlowModel.$asset);
  const initiator = useUnit(payeeFlowModel.$initiator);
  const wallet = useUnit(payeeFlowModel.$wallet);
  const isDraftMode = useUnit(payeeFlowModel.$isDraftMode);
  const errors = useUnit(payeeFlowModel.$errors);
  const wallets = useUnit(walletModel.$wallets);

  if (!chain || !asset) return null;

  return (
    <>
      <ScrollArea>
        <div className="flex flex-col gap-4 px-5 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            {initiator && (
              <div className="flex min-w-0 items-center rounded-lg border border-container-border px-2.5 py-1.5">
                <NamedAccount accountId={initiator.accountId} chain={chain} wallet={wallet} iconSize={20} />
              </div>
            )}
            <div className="flex items-center gap-x-1.5 rounded-lg border border-container-border px-2.5 py-1.5">
              <ChainIcon chain={chain} size={16} />
              <FootnoteText className="text-text-secondary">{chain.name}</FootnoteText>
            </div>
          </div>

          <DraftModeCard isOn={isDraftMode} onToggle={payeeFlowModel.toggleDraftMode} />
          {isDraftMode && (
            <DraftSigningPath
              chainId={chain.chainId}
              asset={asset}
              $draftPath={payeeFlowModel.$draftSigningPath}
              draftPathCommitted={payeeFlowModel.draftPathCommitted}
              draftPathEditStarted={payeeFlowModel.draftPathEditStarted}
              draftPathEditEnded={payeeFlowModel.draftPathEditEnded}
            />
          )}

          <DraftFormBody
            $isDraftMode={payeeFlowModel.$isDraftMode}
            $isDraftPathComplete={payeeFlowModel.$isDraftPathComplete}
          >
            <div className="flex flex-col gap-4">
              {!isDraftMode && <TransactionValidationError errors={errors} wallets={wallets} />}
              <NoSignerError />
              <DestinationField />
              <UnchangedHint />
              {!isDraftMode && <SigningRoute />}
            </div>
          </DraftFormBody>
        </div>
      </ScrollArea>

      <Modal.Footer align="between">
        <Button variant="text" onClick={() => payeeFlowModel.flowClosed()}>
          {t('staking.payeeFlow.cancelButton')}
        </Button>
        <SubmitButton />
      </Modal.Footer>
    </>
  );
};

type OptionValue = { option: PayeeOption };

/**
 * The radio pair and, under the second option, the payout-account picker.
 *
 * The picker searches what the user sees — resolved account names, resolved
 * wallet names and the displayed address — never the raw stored name.
 */
const DestinationField = () => {
  const { t } = useI18n();

  const chain = useUnit(payeeFlowModel.$chain);
  const option = useUnit(payeeFlowModel.$option);
  const address = useUnit(payeeFlowModel.$address);
  const query = useUnit(payeeFlowModel.$destinationQuery);
  const candidates = useUnit(payeeFlowModel.$destinationCandidates);
  const isAddressValid = useUnit(payeeFlowModel.$isAddressValid);
  const wallets = useUnit(walletModel.$wallets);

  const candidateAccounts = useMemo(
    () => candidates.map((candidate) => candidate.account).filter(nonNullable),
    [candidates],
  );
  const resolvedAccounts = useAccountsNames(candidateAccounts, chain);
  const resolvedWallets = useWalletsNames(wallets);

  const destinationOptions = useMemo(() => {
    if (!chain) return [];

    const namesByAccount = new Map(resolvedAccounts.map((account) => [account.id, account.name]));
    const namesByWallet = new Map(resolvedWallets.map((wallet) => [wallet.id, wallet.name]));

    const rows = candidates.map((candidate) => ({
      candidate,
      address: toAddress(candidate.accountId, { prefix: chain.addressPrefix }),
      name: candidate.account
        ? (namesByAccount.get(candidate.account.id) ?? candidate.account.name)
        : (candidate.name ?? ''),
      walletName: candidate.account ? (namesByWallet.get(candidate.account.walletId) ?? '') : '',
    }));

    return performSearch({ records: rows, query, weights: { name: 1, walletName: 0.75, address: 0.5 } }).map(
      ({ candidate, address }) => ({
        id: candidate.id,
        value: address,
        element: (
          <div className="flex w-full justify-between">
            <NamedAccount
              accountId={candidate.accountId}
              chain={chain}
              wallet={candidate.account ? walletUtils.getWalletById(wallets, candidate.account.walletId) : null}
              walletNameAs="fallback"
              variant="short"
              iconSize={20}
              hideExplorers
            />
          </div>
        ),
      }),
    );
  }, [candidates, resolvedAccounts, resolvedWallets, wallets, query, chain]);

  if (!chain) return null;

  const options: RadioOption<OptionValue>[] = [
    { id: 'restake', value: { option: 'restake' }, title: t('staking.bond.restakeRewards') },
    { id: 'account', value: { option: 'account' }, title: t('staking.payeeFlow.accountOption') },
  ];

  const showAddressError = option === 'account' && address.length > 0 && !isAddressValid;

  return (
    <RadioGroup
      label={t('staking.bond.rewardsDestinationLabel')}
      activeId={option}
      options={options}
      onChange={(selected) => payeeFlowModel.optionChanged(selected.value.option)}
    >
      <RadioGroup.Option option={options[0]!} />
      <RadioGroup.Option option={options[1]!}>
        <div className="flex flex-col gap-y-2">
          <Combobox
            placeholder={t('staking.bond.payoutAccountPlaceholder')}
            query={query}
            value={address}
            options={destinationOptions}
            invalid={showAddressError}
            prefixElement={
              <div className="flex h-auto items-center">
                <Identicon
                  address={toAddress(address, { prefix: chain.addressPrefix })}
                  size={20}
                  background={false}
                  canCopy={false}
                />
              </div>
            }
            onInput={(value) => {
              // Free entry: what is typed is the address until an option is picked.
              payeeFlowModel.destinationQueryChanged(value);
              payeeFlowModel.addressChanged(value);
            }}
            onChange={({ value }) => {
              payeeFlowModel.addressChanged(value);
              payeeFlowModel.destinationQueryChanged('');
            }}
          />

          <InputHint active={showAddressError} variant="error">
            {t('staking.bond.incorrectAddressError')}
          </InputHint>
        </div>
      </RadioGroup.Option>
    </RadioGroup>
  );
};

/** Says why the button is dead instead of leaving the user to guess. */
const UnchangedHint = () => {
  const { t } = useI18n();

  const hasChanged = useUnit(payeeFlowModel.$hasChanged);
  const option = useUnit(payeeFlowModel.$option);
  const isAddressValid = useUnit(payeeFlowModel.$isAddressValid);

  // Only when the selection is otherwise complete: an unfinished address has
  // its own error under the field.
  if (hasChanged || (option === 'account' && !isAddressValid)) return null;

  return <FootnoteText className="text-text-tertiary">{t('staking.payeeFlow.unchangedHint')}</FootnoteText>;
};

/**
 * No one on the signing route can sign — the position belongs to a contact or a
 * watch-only account. `$noRouteSigner` is already false in draft mode.
 */
const NoSignerError = () => {
  const { t } = useI18n();

  const noRouteSigner = useUnit(payeeFlowModel.$noRouteSigner);

  if (!noRouteSigner) return null;

  return (
    <Alert active variant="error" title={t('staking.flow.noSignerTitle')}>
      <FootnoteText className="text-text-secondary">{t('staking.flow.noSignerHint')}</FootnoteText>
    </Alert>
  );
};

const SigningRoute = () => {
  const chain = useUnit(payeeFlowModel.$chain);
  const asset = useUnit(payeeFlowModel.$asset);
  const signingPath = useUnit(payeeFlowModel.$signingPath);
  const errors = useUnit(payeeFlowModel.$errors);

  return (
    <SigningPathSection
      signingPath={signingPath}
      chain={chain}
      asset={asset}
      txErrors={errors}
      onChange={payeeFlowModel.signingPathChanged}
    />
  );
};

/**
 * One button, one meaning at a time. In draft mode it creates a draft and the
 * flow ends there; otherwise it walks on to the confirm.
 */
const SubmitButton = () => {
  const { t } = useI18n();

  const isDraftMode = useUnit(payeeFlowModel.$isDraftMode);
  const canContinue = useUnit(payeeFlowModel.$canContinue);
  const canSaveAsDraft = useUnit(payeeFlowModel.$canSaveAsDraft);
  const preparing = useUnit(payeeFlowModel.$preparing);

  if (isDraftMode) {
    return (
      <Button disabled={!canSaveAsDraft} onClick={() => payeeFlowModel.saveAsDraftRequested()}>
        {t('operations.drafts.initiateButton')}
      </Button>
    );
  }

  return (
    <Button disabled={!canContinue} isLoading={preparing} onClick={() => payeeFlowModel.continueRequested()}>
      {t('staking.payeeFlow.continueButton')}
    </Button>
  );
};

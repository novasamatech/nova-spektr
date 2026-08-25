import { useUnit } from 'effector-react';
import { useCallback, useMemo, useState } from 'react';

import { RewardsDestination } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatAsset, toAddress, transferableAmount } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Alert, Button, Combobox, FootnoteText, InputHint, RadioGroup } from '@/shared/ui';
import { type RadioOption } from '@/shared/ui/types';
import { ChainIcon, TransactionValidationError } from '@/shared/ui-entities';
import { Modal, ScrollArea, Select } from '@/shared/ui-kit';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { walletModel } from '@/entities/wallet';
import { AmountInput } from '@/features/assets-balances';
import { DraftFormBody, DraftModeCard, DraftSigningPath } from '@/features/drafts';
import { SigningPathInline } from '@/features/signing-path';
import { NamedAccount } from '@/widgets/NameResolver';
import { AssetFiatBalance } from '@/widgets/price';
import { FeeWithLabel } from '@/widgets/transaction-fee';
import { newPositionFlowModel } from '../model/new-position-flow';

/**
 * Everything a new position needs before the validators are picked: which
 * chain, which account, how much, and where the rewards go.
 *
 * The chain field is what makes this screen different from its siblings. They
 * open against a position and inherit its network; a new position has none, and
 * the dashboard — unlike the Staking page — has no selected network to borrow.
 */
export const InitStep = () => {
  const { t } = useI18n();

  const chain = useUnit(newPositionFlowModel.$chain);
  const asset = useUnit(newPositionFlowModel.$asset);
  const isDraftMode = useUnit(newPositionFlowModel.$isDraftMode);
  const errors = useUnit(newPositionFlowModel.$errors);
  const wallets = useUnit(walletModel.$wallets);

  if (!chain || !asset) return null;

  return (
    <>
      <ScrollArea>
        <div className="flex flex-col gap-4 px-5 pb-4">
          <ChainField />

          <DraftModeCard isOn={isDraftMode} onToggle={newPositionFlowModel.toggleDraftMode} />
          {isDraftMode && (
            <DraftSigningPath
              chainId={chain.chainId}
              asset={asset}
              pinnedSourceAccountId={null}
              $draftPath={newPositionFlowModel.$draftSigningPath}
              draftPathCommitted={newPositionFlowModel.draftPathCommitted}
              draftPathEditStarted={newPositionFlowModel.draftPathEditStarted}
              draftPathEditEnded={newPositionFlowModel.draftPathEditEnded}
            />
          )}

          {/*
            Element order follows the transfer flow: what is being acted on
            (network), who acts (stake from), then the amount, then where the
            proceeds go, then the fee. Deviating per-operation makes two forms
            that ask the same questions feel like different applications.
          */}
          <DraftFormBody
            $isDraftMode={newPositionFlowModel.$isDraftMode}
            $isDraftPathComplete={newPositionFlowModel.$isDraftPathComplete}
          >
            <div className="flex flex-col gap-4">
              {!isDraftMode && <TransactionValidationError errors={errors} wallets={wallets} />}
              <NoSignerError />
              {!isDraftMode && <StakeFromField />}
              <AmountField />
              <OverMaxError />
              <MinimumBondError />
              <DestinationField />
              <FeeRow />
            </div>
          </DraftFormBody>
        </div>
      </ScrollArea>

      <Modal.Footer align="between">
        <Button variant="text" onClick={() => newPositionFlowModel.flowClosed()}>
          {t('staking.newPosition.cancelButton')}
        </Button>
        <SubmitButton />
      </Modal.Footer>
    </>
  );
};

const ChainField = () => {
  const { t } = useI18n();

  const chains = useUnit(newPositionFlowModel.$stakingChains);
  const chain = useUnit(newPositionFlowModel.$chain);

  if (!chain) return null;

  // A single staking network is not a choice — show it, do not ask about it.
  if (chains.length < 2) {
    return (
      <div className="flex w-fit items-center gap-x-1.5 rounded-lg border border-container-border px-2.5 py-1.5">
        <ChainIcon chain={chain} size={16} />
        <FootnoteText className="text-text-secondary">{chain.name}</FootnoteText>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-y-2">
      <FootnoteText className="text-text-tertiary">{t('staking.newPosition.networkLabel')}</FootnoteText>
      <Select
        value={chain.chainId}
        placeholder={t('staking.newPosition.networkPlaceholder')}
        onChange={(chainId) => newPositionFlowModel.chainChanged(chainId)}
      >
        {chains.map((option) => (
          <Select.Item key={option.chainId} value={option.chainId}>
            <div className="flex items-center gap-x-1.5">
              <ChainIcon chain={option} size={16} />
              <span>{option.name}</span>
            </div>
          </Select.Item>
        ))}
      </Select>
    </div>
  );
};

/**
 * "Stake from" is the signing path, not a dropdown beside it.
 *
 * A direct account is a path of one node, and that single card is the field:
 * clicking it opens the same picker a multisig or proxy uses, so choosing the
 * account and choosing who signs for it are one interaction rather than two
 * controls that can disagree. `SigningPathSection` is deliberately not used
 * here — it hides itself below two nodes, which is exactly the case this field
 * has to render.
 */
const StakeFromField = () => {
  const { t } = useI18n();

  const chain = useUnit(newPositionFlowModel.$chain);
  const asset = useUnit(newPositionFlowModel.$asset);
  const signingPath = useUnit(newPositionFlowModel.$signingPath);
  const errors = useUnit(newPositionFlowModel.$errors);
  const balances = useUnit(balanceModel.$balanceMap);

  const errorAccountIds = useMemo<ReadonlySet<AccountId>>(() => {
    const ids = new Set<AccountId>();
    for (const error of errors) {
      const accountId = (error as { account?: { accountId?: AccountId } | null })?.account?.accountId;
      if (accountId) ids.add(accountId);
    }

    return ids;
  }, [errors]);

  const getBalance = useCallback(
    (accountId: AccountId) => {
      if (!chain || !asset) return null;
      const balance = balanceUtils.getBalance(balances, accountId, chain.chainId, asset.assetId);

      return balance ? transferableAmount(balance) : null;
    },
    [balances, chain, asset],
  );

  if (!chain || !asset || signingPath.length === 0) return null;

  return (
    <div className="flex flex-col gap-y-2">
      <FootnoteText className="text-text-tertiary">{t('staking.newPosition.accountLabel')}</FootnoteText>
      <SigningPathInline
        editableInitiator
        restrictToOwnAccounts
        chainId={chain.chainId}
        path={signingPath}
        asset={asset}
        errorAccountIds={errorAccountIds}
        getBalance={getBalance}
        onChange={newPositionFlowModel.signingPathChanged}
      />
    </div>
  );
};

const AmountField = () => {
  const { t } = useI18n();

  const asset = useUnit(newPositionFlowModel.$asset);
  const amount = useUnit(newPositionFlowModel.$amount);
  const amountPlanck = useUnit(newPositionFlowModel.$amountPlanck);
  const available = useUnit(newPositionFlowModel.$available);
  const isOverMax = useUnit(newPositionFlowModel.$isOverMax);

  if (!asset) return null;

  return (
    <div className="flex flex-col gap-y-2">
      <AmountInput
        invalid={isOverMax}
        value={amount}
        balance={available}
        balancePlaceholder={t('staking.newPosition.availableLabel')}
        placeholder={t('staking.newPosition.amountLabel')}
        asset={asset}
        suffixElement={
          <Button size="sm" pallet="secondary" onClick={() => newPositionFlowModel.maxAmountRequested()}>
            {t('staking.newPosition.maxButton')}
          </Button>
        }
        onChange={newPositionFlowModel.amountChanged}
      />
      <AssetFiatBalance asset={asset} amount={amountPlanck.toString()} className="text-footnote" />
    </div>
  );
};

/**
 * The words behind the field's red frame: the account simply does not have the
 * amount. Names the figure the frame is silently comparing against.
 */
const OverMaxError = () => {
  const { t } = useI18n();

  const asset = useUnit(newPositionFlowModel.$asset);
  const available = useUnit(newPositionFlowModel.$available);
  const isOverMax = useUnit(newPositionFlowModel.$isOverMax);

  if (!asset || !isOverMax) return null;

  return (
    <Alert active variant="error" title={t('staking.newPosition.overMaxTitle')}>
      <FootnoteText className="text-text-secondary">
        {t('staking.newPosition.overMaxDescription', { max: formatAsset(available, asset) })}
      </FootnoteText>
    </Alert>
  );
};

/**
 * Red, and blocking — unlike the same figure on the unbond screen, which only
 * warns. `staking.nominate` rejects a stash bonded below the minimum, and the
 * bond and the nomination travel as one batch.
 */
const MinimumBondError = () => {
  const { t } = useI18n();

  const isBelowMinimum = useUnit(newPositionFlowModel.$isBelowMinimumBond);
  const minimumBond = useUnit(newPositionFlowModel.$minimumBond);
  const asset = useUnit(newPositionFlowModel.$asset);

  if (!isBelowMinimum || !asset) return null;

  return (
    <Alert active variant="error" title={t('staking.newPosition.belowMinimumTitle')}>
      <FootnoteText className="text-text-secondary">
        {t('staking.newPosition.belowMinimumDescription', { minimum: formatAsset(minimumBond, asset) })}
      </FootnoteText>
    </Alert>
  );
};

/**
 * No one on the signing route can sign — the picked account is watch-only.
 * `$noRouteSigner` is already false in draft mode.
 */
const NoSignerError = () => {
  const { t } = useI18n();

  const noRouteSigner = useUnit(newPositionFlowModel.$noRouteSigner);

  if (!noRouteSigner) return null;

  return (
    <Alert active variant="error" title={t('staking.flow.noSignerTitle')}>
      <FootnoteText className="text-text-secondary">{t('staking.flow.noSignerHint')}</FootnoteText>
    </Alert>
  );
};

const DestinationField = () => {
  const { t } = useI18n();

  const chain = useUnit(newPositionFlowModel.$chain);
  const accounts = useUnit(newPositionFlowModel.$availableAccounts);
  const destinationType = useUnit(newPositionFlowModel.$destinationType);
  const destination = useUnit(newPositionFlowModel.$destination);
  const isDestinationValid = useUnit(newPositionFlowModel.$isDestinationValid);

  const [query, setQuery] = useState('');

  if (!chain) return null;

  const options: RadioOption<RewardsDestination>[] = [
    { id: '0', value: RewardsDestination.RESTAKE, title: t('staking.newPosition.restakeRewards') },
    { id: '1', value: RewardsDestination.TRANSFERABLE, title: t('staking.newPosition.transferableRewards') },
  ];

  const activeOptionId = destinationType === RewardsDestination.RESTAKE ? '0' : '1';

  const accountOptions = accounts
    .map((account) => ({
      id: account.id.toString(),
      value: toAddress(account.accountId, { prefix: chain.addressPrefix }),
      element: <NamedAccount accountId={account.accountId} chain={chain} iconSize={20} />,
    }))
    .filter((option) => option.value.toLowerCase().includes(query.toLowerCase()));

  return (
    <RadioGroup
      label={t('staking.newPosition.rewardsDestinationLabel')}
      activeId={activeOptionId}
      options={options}
      onChange={(option) => newPositionFlowModel.destinationTypeChanged(option.value)}
    >
      <RadioGroup.Option option={options[0]!} />
      <RadioGroup.Option option={options[1]!}>
        <div className="flex flex-col gap-y-2">
          <Combobox
            placeholder={t('staking.newPosition.payoutAccountPlaceholder')}
            query={query}
            value={destination}
            options={accountOptions}
            invalid={destination.length > 0 && !isDestinationValid}
            onInput={setQuery}
            onChange={({ value }) => newPositionFlowModel.destinationChanged(value)}
          />
          <InputHint active={destination.length > 0 && !isDestinationValid} variant="error">
            {t('staking.newPosition.incorrectAddressError')}
          </InputHint>
        </div>
      </RadioGroup.Option>
    </RadioGroup>
  );
};

const FeeRow = () => {
  const asset = useUnit(newPositionFlowModel.$asset);
  const fee = useUnit(newPositionFlowModel.$fee);
  const pendingFee = useUnit(newPositionFlowModel.$pendingFee);

  if (!asset) return null;

  return <FeeWithLabel asset={asset} fee={fee} isLoading={pendingFee} />;
};

/**
 * In draft mode this creates a draft and the flow ends there; otherwise it
 * walks on to the validators. Signing and draft creation never share a button.
 */
const SubmitButton = () => {
  const { t } = useI18n();

  const isDraftMode = useUnit(newPositionFlowModel.$isDraftMode);
  const canContinue = useUnit(newPositionFlowModel.$canContinue);
  const canSaveAsDraft = useUnit(newPositionFlowModel.$canSaveAsDraft);
  const preparing = useUnit(newPositionFlowModel.$preparing);

  if (isDraftMode) {
    return (
      <Button disabled={!canSaveAsDraft} onClick={() => newPositionFlowModel.saveAsDraftRequested()}>
        {t('operations.drafts.initiateButton')}
      </Button>
    );
  }

  return (
    <Button disabled={!canContinue} isLoading={preparing} onClick={() => newPositionFlowModel.continueRequested()}>
      {t('staking.newPosition.continueButton')}
    </Button>
  );
};

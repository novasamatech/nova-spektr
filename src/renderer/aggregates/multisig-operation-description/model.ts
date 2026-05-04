import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { t } from 'i18next';
import { toast } from 'sonner';

import { type ChainId } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { HttpError, operationDescriptionsResource, operationsService } from '@/domains/backend';
import { type AnyAccount, type Extrinsic, multisigOperationService } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { authModel, backendConfigurationModel } from '@/aggregates/backend';
import { walletSelect } from '@/aggregates/wallet-select';
// Import signModel directly from its model file to avoid pulling in
// OperationSign/index.ts (which re-exports the UI). OperationSign UI imports
// this aggregate, so going through the barrel would create a circular load.
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { type SuccessResult, ExtrinsicResult, submitModel } from '@/features/operations/OperationSubmit';
// Drafts feature pushes flow-active state via setDraftFlowActive — we don't
// import from features/drafts here, since drafts → submit-draft-model →
// OperationSign barrel → UI → aggregate would form a cycle.

const setDescription = createEvent<string>();
const setDraftFlowActive = createEvent<boolean>();

const $description = createStore('')
  .on(setDescription, (_, value) => value)
  .reset(signModel.gates.flow.close);

const $isDraftFlowActive = createStore(false).on(setDraftFlowActive, (_, value) => value);

const $isMultisigInitiator = walletSelect.$selectedWallet.map(walletUtils.isAnyMultisig);

// Set of multisig accountIds that the active wallet operates as. For a regular
// multisig: the single chain-agnostic accountId. For a flexible multisig: the
// inner `multisigAccountId` of every per-chain entry. We can't constrain by
// chain here (the aggregate is rendered before signing has chain context), so
// any one match is enough to enable the input.
const $activeMultisigAccountIds = walletSelect.$selectedAccounts.map((accounts) => {
  const ids = new Set<AccountId>();
  for (const account of accounts) {
    if (accountUtils.isMultisigAccount(account)) {
      ids.add(account.accountId);
    } else if (accountUtils.isFlexibleMultisigAccount(account)) {
      ids.add(account.multisigAccountId);
    }
  }

  return ids;
});

// True iff at least one of the active wallet's multisig accountIds is present
// in the user's address-book contacts. Descriptions only make sense for
// multisigs the user has registered there — that's the audience that can read
// them back.
const $isMultisigInAddressBook = combine(
  {
    multisigIds: $activeMultisigAccountIds,
    contacts: contactModel.$backendContacts,
  },
  ({ multisigIds, contacts }) => {
    if (multisigIds.size === 0) return false;
    for (const contact of contacts) {
      if (multisigIds.has(contact.accountId)) return true;
    }

    return false;
  },
);

// True when the description input should render in the sign step. Drafts carry
// their own description set at creation, so the input is hidden during draft
// submissions to avoid double-posting and confusing UX.
const $showInput = combine(
  {
    isMultisig: $isMultisigInitiator,
    isAuthenticated: authModel.$isAuthenticated,
    isInAddressBook: $isMultisigInAddressBook,
    isDraftActive: $isDraftFlowActive,
  },
  ({ isMultisig, isAuthenticated, isInAddressBook, isDraftActive }) =>
    isMultisig && isAuthenticated && isInAddressBook && !isDraftActive,
);

// Snapshot captured at sign time. Both $description and signModel.$signStore
// reset when OperationSign unmounts (gate.flow.close), which races with the
// async submitModel.done — so we freeze everything we need here.
type PendingContext = {
  description: string;
  chainId: ChainId;
  multisigAccountId: AccountId;
  extrinsic: Extrinsic;
};

const $pendingContext = createStore<PendingContext | null>(null).reset(signModel.init);

function findMultisigAccountId(accounts: AnyAccount[], chainId: ChainId): AccountId | null {
  for (const account of accounts) {
    if (accountUtils.isFlexibleMultisigAccount(account) && account.chainId === chainId) {
      return account.multisigAccountId;
    }
  }
  for (const account of accounts) {
    if (accountUtils.isMultisigAccount(account)) {
      return account.accountId;
    }
  }

  return null;
}

sample({
  clock: signModel.signed,
  source: {
    description: $description,
    selectedWallet: walletSelect.$selectedWallet,
    selectedAccounts: walletSelect.$selectedAccounts,
    signStore: signModel.$signStore,
    isAuthenticated: authModel.$isAuthenticated,
    isInAddressBook: $isMultisigInAddressBook,
    isDraftActive: $isDraftFlowActive,
  },
  filter: (s): boolean => {
    if (s.description.length === 0) return false;
    if (!walletUtils.isAnyMultisig(s.selectedWallet)) return false;
    if (!s.isAuthenticated) return false;
    if (!s.isInAddressBook) return false;
    if (!nonNullable(s.signStore) || s.signStore.length === 0) return false;
    // Drafts post their own description via submit-draft-model — don't double-post.
    if (s.isDraftActive) return false;

    const chainId = s.signStore[0]!.chain.chainId;

    return nonNullable(findMultisigAccountId(s.selectedAccounts, chainId));
  },
  fn: (s): PendingContext => {
    const payload = s.signStore![0]!;
    const chainId = payload.chain.chainId;

    return {
      description: s.description,
      chainId,
      multisigAccountId: findMultisigAccountId(s.selectedAccounts, chainId)!,
      extrinsic: payload.extrinsic,
    };
  },
  target: $pendingContext,
});

function extractCallHash(extrinsic: Extrinsic, fallbackHash: string): string {
  try {
    const innerCall = multisigOperationService.findInnerExtrinsicCall(extrinsic);
    if (innerCall) return innerCall.hash.toHex();
  } catch {
    // fall through to fallback
  }

  return fallbackHash;
}

type PostParams = {
  baseUrl: string;
  multisigAccountId: AccountId;
  chainId: string;
  callHash: string;
  blockNumber: number;
  extrinsicIndex: number;
  description: string;
};

const postDescriptionFx = createEffect(async (params: PostParams) => {
  const { baseUrl, ...body } = params;
  await operationsService.createDescription(baseUrl, body);

  const operationId = `${body.chainId}-${body.callHash}-${body.multisigAccountId}-${body.blockNumber}-${body.extrinsicIndex}`;

  return { operationId, description: body.description };
});

sample({
  clock: submitModel.done,
  source: {
    pending: $pendingContext,
    baseUrl: backendConfigurationModel.$backendUrl,
  },
  filter: (s, results): boolean => {
    if (!nonNullable(s.pending)) return false;
    if (!nonNullable(s.baseUrl)) return false;

    return results.some((r) => r.result === ExtrinsicResult.SUCCESS);
  },
  fn: (s, results): PostParams => {
    const successResult = results.find((r) => r.result === ExtrinsicResult.SUCCESS) as SuccessResult;
    const pending = s.pending!;
    const callHash = extractCallHash(pending.extrinsic, successResult.params.extrinsicHash);

    return {
      baseUrl: s.baseUrl!,
      multisigAccountId: pending.multisigAccountId,
      chainId: pending.chainId,
      callHash,
      blockNumber: successResult.params.timepoint.height,
      extrinsicIndex: successResult.params.timepoint.index,
      description: pending.description,
    };
  },
  target: postDescriptionFx,
});

sample({
  clock: postDescriptionFx.doneData,
  fn: ({ operationId, description }) => ({ id: operationId, description }),
  target: operationDescriptionsResource.descriptionCreated,
});

const showErrorFx = createEffect((error: Error) => {
  const description =
    error instanceof HttpError && error.status === 403 ? t('addressBook.sources.errorForbidden') : error.message;
  toast.error(t('operation.descriptionSaveError'), { description });
});

sample({
  clock: postDescriptionFx.failData,
  target: showErrorFx,
});

export const multisigOperationDescription = {
  $description,
  $showInput,
  setDescription,
  setDraftFlowActive,
};

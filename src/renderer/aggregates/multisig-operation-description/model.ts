import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { t } from 'i18next';
import { toast } from 'sonner';

import { type ChainId } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { activeOperationRoute } from '@/shared/transactions';
import {
  PERMISSIONS,
  descriptionSaveErrorMessage,
  operationDescriptionsResource,
  operationsService,
} from '@/domains/backend';
import { type Extrinsic, multisigOperationService } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { authModel, backendConfigurationModel, connectionHistoryModel } from '@/aggregates/backend';
// Deep import on purpose: this aggregate is loaded early by form-models, and the
// @/features/contacts barrel re-exports heavy contact UI — going through it is the
// cycle trap described in CLAUDE.md. The model file is pure Effector.
// eslint-disable-next-line boundaries/entry-point -- direct import to avoid circular load via the heavy @/features/contacts barrel
import { backendContactsModel } from '@/features/contacts/BackendContacts/model/backend-contacts-model';
// Import signModel directly from its model file to avoid pulling in
// OperationSign/index.ts (which re-exports the UI). OperationSign UI imports
// this aggregate, so going through the barrel would create a circular load.
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { type SuccessResult, ExtrinsicResult, submitModel } from '@/features/operations/OperationSubmit';

import { findRouteMultisigAccountId } from './lib/findRouteMultisigAccountId';
import { resolveDescriptionAreaState } from './lib/resolveDescriptionAreaState';

// Drafts feature pushes flow-active state via setDraftFlowActive — we don't
// import from features/drafts here, since drafts → submit-draft-model →
// OperationSign barrel → UI → aggregate would form a cycle.

const setDescription = createEvent<string>();
const setDraftFlowActive = createEvent<boolean>();

const $description = createStore('')
  .on(setDescription, (_, value) => value)
  .reset(signModel.gates.flow.close);

const $isDraftFlowActive = createStore(false).on(setDraftFlowActive, (_, value) => value);

// The multisig accountId reached by the current operation's signing-path route,
// or null. The route is published by the confirm-store factories, so this works
// for a multisig signed directly AND for one reached via a proxy (where the
// selected wallet is the proxied account, not a multisig) — mirroring how the
// multisig deposit is detected.
const $routeMultisigAccountId = activeOperationRoute.$activeOperationRoute.map(findRouteMultisigAccountId);

// Caller holds the backend `operation:write` permission. Without it the POST is
// rejected at the permissions guard, so the description field is pointless. Read
// from $authState, which is only populated while connected — that's why the
// resolver only consults this on its healthy branch.
const $hasWritePermission = authModel.$authState.map(
  state => state?.permissions.includes(PERMISSIONS.OPERATION_WRITE) ?? false,
);

// True iff the route's multisig is present in the user's address-book contacts.
// Descriptions only make sense for multisigs the user has registered there —
// that's the audience that can read them back. The backend mirrors this: a POST
// for a multisig outside the caller's reachable contacts answers 400/403.
const $isMultisigInAddressBook = combine(
  {
    multisigId: $routeMultisigAccountId,
    contacts: contactModel.$backendContacts,
  },
  ({ multisigId, contacts }) => {
    if (multisigId === null) return false;

    return contacts.some(contact => contact.accountId === multisigId);
  },
);

// Field / error / reconnect / hidden for the description area on initiation
// confirm screens — see resolveDescriptionAreaState for the full decision table.
// Gates on $isHealthy (stricter than authenticated — guarantees the POST can
// succeed) and mirrors the backend's write authorization (operation:write
// permission + multisig is a reachable contact) so the user never hits a
// guaranteed 400/403.
const $descriptionAreaState = combine(
  {
    isMultisig: $routeMultisigAccountId.map(nonNullable),
    isDraftActive: $isDraftFlowActive,
    hasWritePermission: $hasWritePermission,
    isHealthy: backendContactsModel.$isHealthy,
    isInAddressBook: $isMultisigInAddressBook,
    hasEverConnected: connectionHistoryModel.$hasEverConnected,
  },
  resolveDescriptionAreaState,
);

const $showField = $descriptionAreaState.map(state => state === 'field');
const $showReconnect = $descriptionAreaState.map(state => state === 'reconnect');
const $showError = $descriptionAreaState.map(state => state === 'error');

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

sample({
  clock: signModel.signed,
  source: {
    description: $description,
    multisigAccountId: $routeMultisigAccountId,
    signStore: signModel.$signStore,
    isAuthenticated: authModel.$isAuthenticated,
    isInAddressBook: $isMultisigInAddressBook,
    isDraftActive: $isDraftFlowActive,
  },
  filter: (s): boolean => {
    if (s.description.length === 0) return false;
    if (s.multisigAccountId === null) return false;
    if (!s.isAuthenticated) return false;
    if (!s.isInAddressBook) return false;
    if (!nonNullable(s.signStore) || s.signStore.length === 0) return false;
    // Drafts post their own description via submit-draft-model — don't double-post.
    if (s.isDraftActive) return false;

    return true;
  },
  fn: (s): PendingContext => {
    const payload = s.signStore![0]!;

    return {
      description: s.description,
      chainId: payload.chain.chainId,
      multisigAccountId: s.multisigAccountId!,
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

    return results.some(r => r.result === ExtrinsicResult.SUCCESS);
  },
  fn: (s, results): PostParams => {
    const successResult = results.find(r => r.result === ExtrinsicResult.SUCCESS) as SuccessResult;
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
  const description = descriptionSaveErrorMessage(error, t);
  toast.error(t('operation.descriptionSaveError'), { description });
});

sample({
  clock: postDescriptionFx.failData,
  target: showErrorFx,
});

export const multisigOperationDescription = {
  $description,
  $showField,
  $showReconnect,
  $showError,
  // Multisig + chain of the current route — render the account in the error state.
  $multisigAccountId: $routeMultisigAccountId,
  $chain: activeOperationRoute.$activeOperationChain,
  setDescription,
  setDraftFlowActive,
};

import { type OperationBlockReasonKind } from '@/shared/transactions';

export type ActionKind = 'retry' | 'enableNetwork' | 'changeNode' | 'reload' | 'close' | 'cancel';

type ReasonCopyKeys = {
  titleKey: string;
  descriptionKey: string;
  /** First entry is rendered as the primary button. */
  actions: ActionKind[];
};

// The single source of truth for the reason -> i18n key mapping. Kept as a plain,
// non-React object literal (rather than inline in the component) so it can be
// unit-tested against en.json without rendering anything, and so the exhaustiveness
// guarantee below doesn't depend on the component ever being imported.
//
// A Record keyed by the reason kind, NOT a switch. Exhaustiveness here does not
// depend on an explicit return-type annotation: omit a kind and the compiler
// fails with TS2741 (missing property). A switch with an inferred return type
// would silently widen to `ReasonCopyKeys | undefined` instead.
export const REASON_COPY_KEYS: Record<OperationBlockReasonKind, ReasonCopyKeys> = {
  'network-disabled': {
    titleKey: 'operations.blocked.networkDisabledTitle',
    descriptionKey: 'operations.blocked.networkDisabledDescription',
    actions: ['enableNetwork', 'cancel'],
  },
  'network-unreachable': {
    titleKey: 'operations.blocked.networkUnreachableTitle',
    descriptionKey: 'operations.blocked.networkUnreachableDescription',
    actions: ['retry', 'changeNode'],
  },
  'node-rate-limited': {
    titleKey: 'operations.blocked.rateLimitedTitle',
    descriptionKey: 'operations.blocked.rateLimitedDescription',
    actions: ['changeNode', 'retry'],
  },
  'fee-unavailable': {
    titleKey: 'operations.blocked.feeUnavailableTitle',
    descriptionKey: 'operations.blocked.feeUnavailableDescription',
    actions: ['retry', 'changeNode'],
  },
  'no-signatory': {
    titleKey: 'operations.blocked.noSignatoryTitle',
    descriptionKey: 'operations.blocked.noSignatoryDescription',
    actions: ['close'],
  },
  'signing-path-unresolved': {
    titleKey: 'operations.blocked.signingPathUnresolvedTitle',
    descriptionKey: 'operations.blocked.signingPathUnresolvedDescription',
    actions: ['close'],
  },
  'invalid-call-data': {
    titleKey: 'operations.blocked.invalidCallDataTitle',
    descriptionKey: 'operations.blocked.invalidCallDataDescription',
    actions: ['close'],
  },
  internal: {
    titleKey: 'operations.blocked.internalTitle',
    descriptionKey: 'operations.blocked.internalDescription',
    actions: ['reload', 'close'],
  },
};

export const ACTION_LABEL_KEYS: Record<ActionKind, string> = {
  retry: 'operations.blocked.retry',
  enableNetwork: 'operations.blocked.enableNetwork',
  changeNode: 'operations.blocked.changeNode',
  reload: 'operations.blocked.reload',
  close: 'operations.blocked.close',
  cancel: 'operations.blocked.cancel',
};

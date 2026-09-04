import { type ClaimAction } from './claim-types';

/**
 * Whether the release can be signed by anyone at all.
 *
 * `convictionVoting.unlock(class, target)` takes any origin, so a local payer
 * may release a lock it does not own; `remove_vote` and `undelegate` are
 * origin-bound and only the voter's own key (or its multisig/proxy route) can
 * send them. An empty list is not a release — it builds a signable
 * `utility.batchAll([])`, a real fee for a call that frees nothing.
 *
 * The unlock flow guards its incoming requests with this and the dashboard
 * picks a payer with it, so both sides read "who may send this" from one rule.
 */
export const isPermissionlessRelease = (actions: ClaimAction[]) =>
  actions.length > 0 && actions.every((action) => action.type === 'unlock');

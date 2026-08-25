import { type EventCallable, type Store } from 'effector';
import { useUnit } from 'effector-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { type Asset, type ChainId } from '@/shared/core';
import { cnTw, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type PathNode } from '@/domains/backend';
import { networkModel } from '@/entities/network';
import { SigningPathInline, StepPath, pathModel } from '@/features/signing-path';
import { useDraftAvailability } from '../lib/useDraftAvailability';
import { useDraftSources } from '../lib/useDraftSources';

import { DraftSourcesEmpty } from './DraftSourcesEmpty';

const DRAFT_INLINE_HOLD_MS = 500;

type Props = {
  chainId: ChainId | null;
  asset: Asset | null;
  /** Stores from the host flow's `createDraftModeBinding` output. */
  $draftPath: Store<PathNode[]>;
  /** Events from the host flow's `createDraftModeBinding` output. */
  draftPathCommitted: EventCallable<PathNode[]>;
  draftPathEditStarted: EventCallable<void>;
  draftPathEditEnded: EventCallable<void>;
  /** Forwarded to `StepPath` / `SigningPathInline`. Default: no restriction. */
  allowedProxyTypes?: readonly string[];
  /**
   * Fix the draft's source to this address; the user picks the hops after it,
   * never the account it runs from. Omitted (or `null`) when the operation has
   * no origin of its own yet — see the note on the component.
   */
  pinnedSourceAccountId?: AccountId | null;
  /**
   * Closes the host flow when the empty state sends the user to the address
   * book. The "Open address book" button is rendered only when this is given:
   * flows mounted in the global modals slot outlive navigation and would stay
   * on top of the page they sent the user to. Hosts that leave it off get the
   * explanation without a navigating control.
   */
  onLeaveFlow?: () => void;
};

/**
 * Draft-mode signing-path picker: surfaces the shared `pathModel`-driven
 * StepPath, restricted to External Address Book contacts, then crossfades to a
 * compact `SigningPathInline` once the user finishes picking. Mirrors the
 * `CreateDraftModal`'s path policy so both surfaces produce equivalent draft
 * seeds.
 *
 * With `pinnedSourceAccountId` the first hop is decided for the user and the
 * source list collapses to that one entry. Callers that opened this for a
 * _specific_ account — a staking position, say — must pin it: a draft records
 * the exact route it will be submitted along, and the host flows build the
 * draft's call from the path's first node. Left free, the user can author an
 * `unbond` for contact A's position sourced at contact B, and the draft either
 * acts on B's ledger or fails outright at submission — after it has been
 * reviewed and co-signed. Pinning removes the class of mistake instead of
 * validating against it.
 *
 * Leaving it off is the other real answer, not an opt-out: a flow that is
 * _choosing_ an origin rather than acting on one — opening a brand-new stake, a
 * transfer, a vote, or submitting a permissionless payout anybody may pay for —
 * has nothing to pin, and the source list is the control the user came for.
 * That is why the prop stays optional: making it required would put the word
 * `null` in every such form for no gain. The cost is that a future flow opened
 * for one account can forget to pin; see the drafts README for the surfaces
 * this is still open on.
 *
 * The picker is only ever shown with something to pick. While the address book
 * is offline nothing renders — the mode card above carries the reconnect prompt
 * and a dead list under it would only contradict it. With the book reachable
 * but no source to offer, or with no permission to write drafts, an explanation
 * with the next move stands in for the list; see `DraftSourcesEmpty`.
 */
export const DraftSigningPath = memo(
  ({
    chainId,
    asset,
    $draftPath,
    draftPathCommitted,
    draftPathEditStarted,
    draftPathEditEnded,
    allowedProxyTypes,
    pinnedSourceAccountId,
    onLeaveFlow,
  }: Props) => {
    const availability = useDraftAvailability();
    const chains = useUnit(networkModel.$chains);
    const isPathComplete = useUnit(pathModel.$isComplete);
    const livePath = useUnit(pathModel.$path);
    // Bound through `useUnit`, not called off the module: the event has to run
    // in whatever scope this tree is rendered under, or the seed lands in the
    // global scope and the picker below never sees its own source.
    const seedPath = useUnit(pathModel.pathSeeded);
    const draftPath = useUnit($draftPath);

    // Which sources a draft may start from is the drafts feature's own rule —
    // address-book entries that the signing-path graph can actually route from.
    // Shared with whoever decides *whether* to open this picker in the first
    // place, so the two cannot disagree about an empty list.
    const { sources: allDraftSources, filterNextOption } = useDraftSources(chainId, allowedProxyTypes);

    // Pinned: one source, and it is not a choice. Filtering the list rather
    // than only locking the card means an address the graph cannot route from
    // leaves the picker genuinely empty, instead of quietly offering some other
    // account the user never asked about.
    const draftSources = useMemo(
      () =>
        pinnedSourceAccountId
          ? allDraftSources.filter((source) => source.accountId === pinnedSourceAccountId)
          : allDraftSources,
      [allDraftSources, pinnedSourceAccountId],
    );

    // The node kind comes from the graph, not from the caller: a flexible
    // multisig enters as `proxied` and a plain one as `multisig`, and the path
    // grammar rejects the wrong one.
    const pinnedNode = useMemo<PathNode | null>(() => {
      const source = pinnedSourceAccountId ? draftSources.at(0) : undefined;
      if (!source) return null;

      return { kind: source.isProxy ? 'proxied' : 'multisig', accountId: source.accountId };
    }, [draftSources, pinnedSourceAccountId]);

    // `pathModel` is a singleton the edit modal and the host flow both reset,
    // so the pinned root is re-asserted whenever it goes missing rather than
    // seeded once. Synchronising a shared external unit is what this effect is
    // for; there is no render-time way to own state that lives outside React.
    const pinnedRootMissing = pinnedNode !== null && livePath.at(0)?.accountId !== pinnedNode.accountId;
    useEffect(() => {
      if (pinnedNode && pinnedRootMissing) {
        seedPath([pinnedNode]);
      }
    }, [pinnedNode, pinnedRootMissing, seedPath]);

    // Hold the StepPath "Path complete" success card for a beat after the user
    // finishes picking, then crossfade to the editable inline view. Gives the
    // user a moment to register the success state before the cards become
    // individually clickable.
    const [showInline, setShowInline] = useState(draftPath.length > 0);
    useEffect(() => {
      if (draftPath.length === 0) {
        setShowInline(false);

        return;
      }
      if (showInline) return;
      const timer = setTimeout(() => setShowInline(true), DRAFT_INLINE_HOLD_MS);

      return () => clearTimeout(timer);
    }, [draftPath.length, showInline]);

    const handleEditOpenChange = useCallback(
      (open: boolean) => {
        if (open) draftPathEditStarted();
        else draftPathEditEnded();
      },
      [draftPathEditStarted, draftPathEditEnded],
    );

    const handleDraftChange = useCallback(
      (path: PathNode[]) => {
        draftPathCommitted(path);
      },
      [draftPathCommitted],
    );

    if (!chainId || !asset) return null;
    if (availability === 'offline') return null;

    if (availability !== 'ready' || draftSources.length === 0) {
      const chain = chains[chainId];

      return (
        <DraftSourcesEmpty
          availability={availability}
          pinnedAddress={
            pinnedSourceAccountId ? toAddress(pinnedSourceAccountId, { prefix: chain?.addressPrefix }) : null
          }
          chainName={chain?.name ?? ''}
          onLeaveFlow={onLeaveFlow}
        />
      );
    }

    // Drive the wrapper height via min-h (not max-h) so the form below rides a
    // single smooth transition instead of snapping when StepPath internally
    // swaps option list → green card. The inline floor matches the natural
    // PathChip + cards row height so the form below slides flush against it.
    //   inline    – PathChip + cards row + optional hint (~100px content)
    //   complete  – StepPath "Path complete" green card (~150px content)
    //   picker    – StepPath with source list / next-option list (~520px content)
    const heightClass = showInline
      ? 'min-h-[100px] max-h-[200px]'
      : draftPath.length > 0 || isPathComplete
        ? 'min-h-[150px] max-h-[320px]'
        : 'min-h-[520px] max-h-[720px]';

    return (
      <div className={cnTw('overflow-hidden transition-[min-height,max-height] duration-300 ease-out', heightClass)}>
        {showInline ? (
          <div key="inline" className="duration-300 animate-in fade-in">
            <SigningPathInline
              chainId={chainId}
              path={draftPath}
              asset={asset}
              getBalance={() => null}
              editableInitiator={!pinnedSourceAccountId}
              sources={draftSources}
              filterNextOption={filterNextOption}
              restrictToOwnAccounts={false}
              allowedProxyTypes={allowedProxyTypes}
              onChange={handleDraftChange}
              onEditOpenChange={handleEditOpenChange}
            />
          </div>
        ) : (
          <StepPath
            className="min-h-0"
            chainId={chainId}
            sources={draftSources}
            lockedSourceCount={pinnedNode ? 1 : 0}
            filterNextOption={filterNextOption}
            allowedProxyTypes={allowedProxyTypes}
          />
        )}
      </div>
    );
  },
);

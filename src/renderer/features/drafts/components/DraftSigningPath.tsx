import { type EventCallable, type Store } from 'effector';
import { useUnit } from 'effector-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { type Asset, type ChainId } from '@/shared/core';
import { cnTw } from '@/shared/lib/utils';
import { type PathNode } from '@/domains/backend';
import { contactModel } from '@/entities/contact';
import {
  type PathNextOption,
  type PathSource,
  SigningPathInline,
  StepPath,
  graphModel,
  pathModel,
} from '@/features/signing-path';

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
};

/**
 * Draft-mode signing-path picker: surfaces the shared `pathModel`-driven
 * StepPath, restricted to External Address Book contacts, then crossfades to a
 * compact `SigningPathInline` once the user finishes picking. Mirrors the
 * `CreateDraftModal`'s path policy so both surfaces produce equivalent draft
 * seeds.
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
  }: Props) => {
    const isPathComplete = useUnit(pathModel.$isComplete);
    const draftPath = useUnit($draftPath);

    const sourcesStore = useMemo(
      () => graphModel.$sourcesFor(chainId ?? ('0x00' as ChainId), { allowedProxyTypes }),
      [chainId, allowedProxyTypes],
    );
    const allSources = useUnit(sourcesStore);
    const backendContacts = useUnit(contactModel.$backendContacts);

    // Drafts restrict sources to External Address-Book entries (same policy
    // CreateDraftModal applies). Multisig hops past the source must also be
    // address-book entries; signers (leaves of a multisig) are left unfiltered.
    const addressBookIds = useMemo(() => new Set(backendContacts.map((c) => c.accountId)), [backendContacts]);

    const draftSources = useMemo<PathSource[]>(
      () => allSources.filter((s) => addressBookIds.has(s.accountId)),
      [allSources, addressBookIds],
    );

    const filterNextOption = useMemo<(option: PathNextOption) => boolean>(
      () => (option) => option.kind !== 'multisig' || addressBookIds.has(option.accountId),
      [addressBookIds],
    );

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
              editableInitiator
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
            filterNextOption={filterNextOption}
            allowedProxyTypes={allowedProxyTypes}
          />
        )}
      </div>
    );
  },
);

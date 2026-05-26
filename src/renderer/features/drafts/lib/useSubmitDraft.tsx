import { useUnit } from 'effector-react';
import { type ReactNode, useState } from 'react';

import { type ChainId } from '@/shared/core';
import { type Draft } from '@/domains/backend';
import { accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';
import { SubmitDraftModal } from '../components/SubmitDraftModal';
import { submitDraftModel } from '../model/submit-draft-model';

export type UseSubmitDraft = {
  submitDraft: (draft: Draft) => void;
  modal: ReactNode;
};

export const useSubmitDraft = (): UseSubmitDraft => {
  const allAccounts = useUnit(accounts.$list);
  const chains = useUnit(networkModel.$chains);
  const [isOpen, setIsOpen] = useState(false);

  const submitDraft = (draft: Draft) => {
    if (!draft.multisigAccountId) return;

    const chain = chains[draft.chainId as ChainId];
    if (!chain) return;

    const multisigAccounts = allAccounts.filter(accountUtils.isAnyMultisigAccount);
    // `initiator` here is a legacy fallback only: for path-driven drafts
    // submitDraftModel derives `$initiator` from `signingPath[0]`. It still
    // matters for legacy drafts (empty `signingPath`). Note this branch picks
    // the deepest multisig for nested paths — that's wrong for routing but
    // harmless because the model overrides it when a saved path is present.
    const initiator = draft.proxyAccountId
      ? (allAccounts.find((a) => a.accountId === draft.proxyAccountId) ?? null)
      : (multisigAccounts.find((a) => a.accountId === draft.multisigAccountId) ?? null);

    // `displayInitiator` is consumed verbatim by the confirm UI — for flex
    // drafts we want the multisig facade label, not the pure proxied address.
    const displayInitiator = draft.proxyAccountId
      ? (multisigAccounts.find((a) => a.accountId === draft.multisigAccountId) ?? null)
      : undefined;

    setIsOpen(true);
    submitDraftModel.flowStarted({ draft, initiator, displayInitiator, chain });
  };

  const modal = isOpen ? <SubmitDraftModal onClose={() => setIsOpen(false)} /> : null;

  return { submitDraft, modal };
};

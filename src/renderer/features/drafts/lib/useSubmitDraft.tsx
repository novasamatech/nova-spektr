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
    const initiator = draft.proxyAccountId
      ? (allAccounts.find((a) => a.accountId === draft.proxyAccountId) ?? null)
      : (multisigAccounts.find((a) => a.accountId === draft.multisigAccountId) ?? null);

    const displayInitiator = draft.proxyAccountId
      ? (multisigAccounts.find((a) => a.accountId === draft.multisigAccountId) ?? null)
      : undefined;

    setIsOpen(true);
    submitDraftModel.flowStarted({ draft, initiator, displayInitiator, chain });
  };

  const modal = isOpen ? <SubmitDraftModal onClose={() => setIsOpen(false)} /> : null;

  return { submitDraft, modal };
};

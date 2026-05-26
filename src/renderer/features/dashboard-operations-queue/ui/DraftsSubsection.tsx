import { useUnit } from 'effector-react';
import { useNavigate } from 'react-router-dom';

import { type Chain, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
import { type Draft } from '@/domains/backend';
import { networkModel } from '@/entities/network';
import { walletModel, walletUtils } from '@/entities/wallet';
import { authModel } from '@/aggregates/backend';
import {
  type DraftSubmitGate,
  DraftIcon,
  draftDeepLinkModel,
  getDraftSubmitGate,
  useDraftOperationTitle,
  useDraftTransactionAmount,
  useSubmitDraft,
} from '@/features/drafts';
import { AccountName } from '@/widgets/NameResolver';
import { OperationAmount } from '@/widgets/transaction-amount';
import { useMultisigByAccountId } from '../model/use-multisig-by-account-id';

import { GroupedList } from './GroupedList';
import { QueueRow } from './QueueRow';
import { QueueSubsection } from './QueueSubsection';

type Props = {
  drafts: Draft[];
};

export const DraftsSubsection = ({ drafts }: Props) => {
  const { t } = useI18n();
  const { submitDraft, modal: submitDraftModalNode } = useSubmitDraft();
  const chains = useUnit(networkModel.$chains);
  const wallets = useUnit(walletModel.$wallets);
  const isAuthenticated = useUnit(authModel.$isAuthenticated);
  const multisigByAccountId = useMultisigByAccountId();

  return (
    <>
      <QueueSubsection title={t('dashboard.operationsQueue.drafts')} count={drafts.length} tone="accent">
        <GroupedList
          items={drafts}
          getKey={(d) => d.id}
          getTimestamp={(d) => new Date(d.createdAt).getTime()}
          renderItem={(draft) => {
            const account = draft.multisigAccountId ? (multisigByAccountId.get(draft.multisigAccountId) ?? null) : null;
            const wallet = account ? (walletUtils.getWalletById(wallets, account.walletId) ?? null) : null;
            const gate = getDraftSubmitGate(draft, isAuthenticated, Boolean(account));

            return (
              <DraftQueueRow
                draft={draft}
                chain={chains[draft.chainId]}
                wallet={wallet}
                gate={gate}
                onSubmit={submitDraft}
              />
            );
          }}
        />
      </QueueSubsection>
      {submitDraftModalNode}
    </>
  );
};

type DraftQueueRowProps = {
  draft: Draft;
  chain: Chain | undefined;
  wallet: Wallet | null;
  gate: DraftSubmitGate;
  onSubmit: (draft: Draft) => void;
};

const DraftQueueRow = ({ draft, chain, wallet, gate, onSubmit }: DraftQueueRowProps) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const operationTitle = useDraftOperationTitle(draft);
  const amount = useDraftTransactionAmount(draft);

  return (
    <QueueRow
      leadingIcon={<DraftIcon />}
      title={operationTitle ?? t('operations.titles.unknown')}
      chain={chain}
      subtitle={
        draft.multisigAccountId ? (
          <AccountName accountId={draft.multisigAccountId} chain={chain} wallet={wallet} />
        ) : null
      }
      description={draft.description}
      descriptionMaxChars={120}
      value={amount ? <OperationAmount value={amount.value} asset={amount.asset} /> : null}
      action={
        <Tooltip open={gate.canSubmit ? false : undefined}>
          <Tooltip.Trigger>
            <Button
              size="sm"
              variant="fill"
              className="w-[104px]"
              disabled={!gate.canSubmit}
              onClick={() => onSubmit(draft)}
            >
              {t('operations.drafts.submitButton')}
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>{gate.reasonKey ? t(gate.reasonKey) : ''}</Tooltip.Content>
        </Tooltip>
      }
      onClick={() => navigate(draftDeepLinkModel.generateDraftRelativeLink(draft.id))}
    />
  );
};

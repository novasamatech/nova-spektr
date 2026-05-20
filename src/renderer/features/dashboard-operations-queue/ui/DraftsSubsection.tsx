import { useUnit } from 'effector-react';
import { useNavigate } from 'react-router-dom';

import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { Account } from '@/shared/ui-entities';
import { Tooltip } from '@/shared/ui-kit';
import { type Draft } from '@/domains/backend';
import { networkModel } from '@/entities/network';
import { walletModel, walletUtils } from '@/entities/wallet';
import { authModel } from '@/aggregates/backend';
import { DraftIcon, draftDeepLinkModel, getDraftSubmitGate, useSubmitDraft } from '@/features/drafts';
import { useMultisigByAccountId } from '../model/use-multisig-by-account-id';

import { GroupedList } from './GroupedList';
import { QueueRow } from './QueueRow';
import { QueueSubsection } from './QueueSubsection';

const TITLE_MAX_LENGTH = 30;

const truncateTitle = (text: string) =>
  text.length > TITLE_MAX_LENGTH ? `${text.slice(0, TITLE_MAX_LENGTH).trimEnd()}…` : text;

type Props = {
  drafts: Draft[];
};

export const DraftsSubsection = ({ drafts }: Props) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const chains = useUnit(networkModel.$chains);
  const wallets = useUnit(walletModel.$wallets);
  const isAuthenticated = useUnit(authModel.$isAuthenticated);
  const multisigByAccountId = useMultisigByAccountId();
  const { submitDraft, modal: submitDraftModalNode } = useSubmitDraft();

  return (
    <>
      <QueueSubsection title={t('dashboard.operationsQueue.drafts')} count={drafts.length} tone="accent">
        <GroupedList
          items={drafts}
          getKey={(d) => d.id}
          getTimestamp={(d) => new Date(d.createdAt).getTime()}
          renderItem={(draft) => {
            const chain = chains[draft.chainId];
            const account = draft.multisigAccountId ? multisigByAccountId.get(draft.multisigAccountId) : undefined;
            const wallet = account ? walletUtils.getWalletById(wallets, account.walletId) : undefined;
            const gate = getDraftSubmitGate(draft, isAuthenticated, Boolean(account));

            return (
              <QueueRow
                leadingIcon={<DraftIcon />}
                title={truncateTitle(draft.description || t('dashboard.operationsQueue.untitledDraft'))}
                account={
                  draft.multisigAccountId ? (
                    <Account
                      accountId={draft.multisigAccountId}
                      chain={chain ?? null}
                      title={wallet?.name}
                      walletType={wallet?.type}
                      iconSize={32}
                      hideExplorers
                    />
                  ) : null
                }
                chain={chain}
                action={
                  <div className="grid w-[220px] shrink-0 grid-cols-2 gap-x-2">
                    <div />
                    <Tooltip open={gate.canSubmit ? false : undefined}>
                      <Tooltip.Trigger>
                        <Button
                          size="sm"
                          variant="fill"
                          className="w-full"
                          disabled={!gate.canSubmit}
                          onClick={() => submitDraft(draft)}
                        >
                          {t('operations.drafts.submitButton')}
                        </Button>
                      </Tooltip.Trigger>
                      <Tooltip.Content>{gate.reasonKey ? t(gate.reasonKey) : ''}</Tooltip.Content>
                    </Tooltip>
                  </div>
                }
                onClick={() => navigate(draftDeepLinkModel.generateDraftRelativeLink(draft.id))}
              />
            );
          }}
        />
      </QueueSubsection>
      {submitDraftModalNode}
    </>
  );
};

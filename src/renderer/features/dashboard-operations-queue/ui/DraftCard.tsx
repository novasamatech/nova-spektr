import { useUnit } from 'effector-react';

import { type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
import { type Draft } from '@/domains/backend';
import { networkModel } from '@/entities/network';
import { walletModel, walletUtils } from '@/entities/wallet';
import { authModel } from '@/aggregates/backend';
import { DraftIcon, getDraftSubmitGate, useDraftOperationTitle } from '@/features/drafts';
import { NamedAccount } from '@/widgets/NameResolver';
import { useMultisigByAccountId } from '../model/use-multisig-by-account-id';

import { OperationCardShell } from './OperationCardShell';

type Props = {
  draft: Draft;
  onSkip: () => void;
  onSubmit: (draft: Draft) => void;
};

export const DraftCard = ({ draft, onSkip, onSubmit }: Props) => {
  const { t } = useI18n();
  const chains = useUnit(networkModel.$chains);
  const wallets = useUnit(walletModel.$wallets);
  const isAuthenticated = useUnit(authModel.$isAuthenticated);
  const multisigByAccountId = useMultisigByAccountId();
  const operationTitle = useDraftOperationTitle(draft);

  const chain: Chain | undefined = chains[draft.chainId];
  const accountId = draft.proxyAccountId ?? draft.multisigAccountId ?? draft.initiatorAccountId ?? null;
  const account = draft.multisigAccountId ? (multisigByAccountId.get(draft.multisigAccountId) ?? null) : null;
  const wallet = account ? (walletUtils.getWalletById(wallets, account.walletId) ?? null) : null;
  const gate = getDraftSubmitGate(draft, isAuthenticated, Boolean(account));

  return (
    <OperationCardShell
      leadingIcon={<DraftIcon />}
      title={operationTitle ?? t('operations.titles.unknown')}
      chain={chain}
      metaLabel={t('dashboard.operationsQueue.draftBadge')}
      accountSlot={
        accountId ? (
          <NamedAccount
            accountId={accountId}
            chain={chain}
            wallet={wallet}
            iconSize={20}
            hideExplorers
            variant="short"
          />
        ) : null
      }
      description={draft.description}
      skipButton={
        <Button size="sm" variant="text" onClick={onSkip}>
          {t('dashboard.operationsQueue.skip')}
        </Button>
      }
      actionButton={
        <Tooltip open={gate.canSubmit ? false : undefined}>
          <Tooltip.Trigger>
            <Button
              size="sm"
              variant="fill"
              className="w-full"
              disabled={!gate.canSubmit}
              onClick={() => onSubmit(draft)}
            >
              {t('operations.drafts.submitButton')}
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>{gate.reasonKey ? t(gate.reasonKey) : ''}</Tooltip.Content>
        </Tooltip>
      }
    />
  );
};

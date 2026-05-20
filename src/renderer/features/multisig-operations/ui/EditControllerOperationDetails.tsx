import { useStoreMap, useUnit } from 'effector-react';
import { useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Button, FootnoteText, SmallTitleText } from '@/shared/ui';
import { type MultisigOperation, accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { type MultisigCandidate, multisigCandidates } from '@/aggregates/multisig-candidates';
import { WalletDetails } from '@/features/wallet-details';
import { NamedAccount } from '@/widgets/NameResolver';
import { parseProxyEditOperation } from '../lib/proxy-edit';

type Props = {
  operation: MultisigOperation;
};

export const EditControllerOperationDetails = ({ operation }: Props) => {
  const { t } = useI18n();

  const chain = useStoreMap({
    store: networkModel.$chains,
    keys: [operation.chainId],
    fn: (chains, [chainId]) => chains[chainId] ?? null,
  });

  const candidates = useUnit(multisigCandidates.$candidates);
  const wallets = useUnit(walletModel.$wallets);
  const allAccounts = useUnit(accounts.$list);

  const info = parseProxyEditOperation(operation);

  const newControllerCandidate = useMemo(() => {
    if (!info) return null;
    return candidates.find(c => c.accountId === info.newControllerAccountId) ?? null;
  }, [candidates, info]);

  const oldControllerCandidate = useMemo(() => {
    if (!info || !info.isTrustedFlow) return null;
    return candidates.find(c => c.accountId === info.oldControllerAccountId) ?? null;
  }, [candidates, info]);

  const proxiedWallet = useMemo(() => {
    const accountId = operation.proxiedAccountId ?? operation.multisigAccountId;
    if (!accountId) return null;
    const account = allAccounts.find(a => a.accountId === accountId);
    if (!account) return null;
    return wallets.find(w => w.id === account.walletId) ?? null;
  }, [allAccounts, wallets, operation.proxiedAccountId, operation.multisigAccountId]);

  const [isOverviewOpen, setIsOverviewOpen] = useState(false);

  if (!info) return null;

  const renderControllerSection = (label: string, accountId: AccountId, candidate: MultisigCandidate | null) => {
    const signatories = candidate?.signatories ?? null;
    const threshold = candidate?.threshold ?? null;
    const total = signatories?.length ?? null;

    return (
      <div className="flex flex-col gap-y-2">
        <SmallTitleText>{label}</SmallTitleText>
        <FootnoteText className="text-text-secondary">
          <NamedAccount accountId={accountId} chain={chain ?? undefined} variant="short" />
        </FootnoteText>

        {signatories && threshold !== null && total !== null && (
          <>
            <FootnoteText className="text-text-tertiary">
              {t('operations.editProxy.details.threshold', { threshold, total })}
            </FootnoteText>

            <ul className="flex flex-col gap-y-1.5">
              {signatories.map(signatoryId => (
                <li key={signatoryId} className="flex items-center gap-x-2">
                  <FootnoteText className="truncate text-text-secondary">
                    <NamedAccount accountId={signatoryId} chain={chain ?? undefined} variant="short" />
                  </FootnoteText>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-y-3">
      {info.isTrustedFlow &&
        renderControllerSection(
          t('operations.editProxy.details.previousSection'),
          info.oldControllerAccountId,
          oldControllerCandidate,
        )}

      {renderControllerSection(
        t('operations.editProxy.details.targetSection'),
        info.newControllerAccountId,
        newControllerCandidate,
      )}

      <div className="flex flex-col gap-y-1">
        <SmallTitleText>{t('operations.editProxy.details.modeSection')}</SmallTitleText>
        <FootnoteText className={info.isTrustedFlow ? 'text-icon-warning' : 'text-text-positive'}>
          {info.isTrustedFlow
            ? t('operations.editProxy.details.trustedDescription')
            : t('operations.editProxy.details.verifiedDescription')}
        </FootnoteText>
      </div>

      {proxiedWallet && (
        <>
          <Button className="self-start p-0" size="sm" variant="text" onClick={() => setIsOverviewOpen(true)}>
            {t('operations.editProxy.details.openProxyDetails')}
          </Button>

          <WalletDetails
            isOpen={isOverviewOpen}
            wallet={proxiedWallet}
            defaultTab="proxies"
            onClose={() => setIsOverviewOpen(false)}
          />
        </>
      )}
    </div>
  );
};

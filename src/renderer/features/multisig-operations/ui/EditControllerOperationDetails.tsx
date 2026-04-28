import { useStoreMap, useUnit } from 'effector-react';
import { useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Button, FootnoteText, SmallTitleText } from '@/shared/ui';
import { Identicon } from '@/shared/ui-entities';
import { type MultisigOperation, accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { multisigCandidates } from '@/aggregates/multisig-candidates';
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

  const proxiedWallet = useMemo(() => {
    const accountId = operation.proxiedAccountId ?? operation.multisigAccountId;
    if (!accountId) return null;
    const account = allAccounts.find(a => a.accountId === accountId);
    if (!account) return null;
    return wallets.find(w => w.id === account.walletId) ?? null;
  }, [allAccounts, wallets, operation.proxiedAccountId, operation.multisigAccountId]);

  const [isOverviewOpen, setIsOverviewOpen] = useState(false);

  if (!info) return null;

  const oldAddress = toAddress(info.oldControllerAccountId, { prefix: chain?.addressPrefix });
  const newAddress = toAddress(info.newControllerAccountId, { prefix: chain?.addressPrefix });

  const newSignatories = newControllerCandidate?.signatories ?? null;
  const newThreshold = newControllerCandidate?.threshold ?? null;
  const newTotal = newSignatories?.length ?? null;

  return (
    <div className="flex flex-col gap-y-3">
      <SmallTitleText>{t('operations.editController.details.headerLabel')}</SmallTitleText>

      <div className="flex items-center gap-x-2">
        <Identicon address={oldAddress} size={28} background={false} canCopy={false} />
        <span aria-hidden="true" className="text-text-tertiary">
          →
        </span>
        <Identicon address={newAddress} size={28} background={false} canCopy={false} />
        {newControllerCandidate?.name && (
          <FootnoteText className="ml-2 truncate text-text-primary">{newControllerCandidate.name}</FootnoteText>
        )}
      </div>

      <div className="flex flex-col gap-y-2">
        <SmallTitleText>{t('operations.editController.details.targetSection')}</SmallTitleText>
        <FootnoteText className="text-text-secondary">
          <NamedAccount accountId={info.newControllerAccountId} chain={chain ?? undefined} variant="short" />
        </FootnoteText>

        {newSignatories && newThreshold !== null && newTotal !== null && (
          <>
            <FootnoteText className="text-text-tertiary">
              {t('operations.editController.details.threshold', { threshold: newThreshold, total: newTotal })}
            </FootnoteText>

            <ul className="flex flex-col gap-y-1.5">
              {newSignatories.map((signatoryId: AccountId) => {
                const address = toAddress(signatoryId, { prefix: chain?.addressPrefix });

                return (
                  <li key={signatoryId} className="flex items-center gap-x-2">
                    <Identicon address={address} size={20} background={false} canCopy={false} />
                    <FootnoteText className="truncate text-text-secondary">
                      <NamedAccount accountId={signatoryId} chain={chain ?? undefined} variant="short" />
                    </FootnoteText>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      <div className="flex flex-col gap-y-1">
        <SmallTitleText>{t('operations.editController.details.modeSection')}</SmallTitleText>
        <FootnoteText className={info.isTrustedFlow ? 'text-icon-warning' : 'text-text-positive'}>
          {info.isTrustedFlow
            ? t('operations.editController.details.trustedDescription')
            : t('operations.editController.details.verifiedDescription')}
        </FootnoteText>
      </div>

      {proxiedWallet && (
        <>
          <Button className="self-start p-0" size="sm" variant="text" onClick={() => setIsOverviewOpen(true)}>
            {t('operations.editController.details.openOverview')}
          </Button>

          <WalletDetails isOpen={isOverviewOpen} wallet={proxiedWallet} onClose={() => setIsOverviewOpen(false)} />
        </>
      )}
    </div>
  );
};

import { useStoreMap, useUnit } from 'effector-react';
import { useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { Button, DETAIL_ROW_ACCOUNT_ICON_SIZE, FootnoteText, SmallTitleText } from '@/shared/ui';
import { type MultisigOperation, accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { WalletDetails } from '@/features/wallet-details';
import { NamedAccount } from '@/widgets/NameResolver';
import { parseVerifyProxyOperation } from '../lib/verify-proxy-op';

type Props = {
  operation: MultisigOperation;
};

export const VerifyProxyOperationDetails = ({ operation }: Props) => {
  const { t } = useI18n();

  const chain = useStoreMap({
    store: networkModel.$chains,
    keys: [operation.chainId],
    fn: (chains, [chainId]) => chains[chainId] ?? null,
  });

  const wallets = useUnit(walletModel.$wallets);
  const allAccounts = useUnit(accounts.$list);

  const info = parseVerifyProxyOperation(operation);

  // "Open wallet details" lands on the pure proxy wallet's proxies tab — that's where
  // the verification status of its delegates is surfaced. The displayed "verifying wallet"
  // (delegate, A) is a separate concern and stays as text-only via NamedAccount.
  const proxiedWallet = useMemo(() => {
    if (!info) return null;
    const account = allAccounts.find(a => a.accountId === info.pureProxyAccountId);
    if (!account) return null;
    return wallets.find(w => w.id === account.walletId) ?? null;
  }, [allAccounts, wallets, info]);

  const [isOverviewOpen, setIsOverviewOpen] = useState(false);

  if (!info) return null;

  return (
    <div className="flex flex-col gap-y-3">
      <div className="flex flex-col gap-y-2">
        <SmallTitleText>{t('operations.verifyProxy.details.targetSection')}</SmallTitleText>
        <FootnoteText className="text-text-secondary">
          <NamedAccount
            accountId={info.delegateAccountId}
            chain={chain ?? undefined}
            variant="short"
            iconSize={DETAIL_ROW_ACCOUNT_ICON_SIZE}
          />
        </FootnoteText>
      </div>

      {info.remark && (
        <div className="flex flex-col gap-y-2">
          <SmallTitleText>{t('operations.verifyProxy.details.remark')}</SmallTitleText>
          <FootnoteText className="break-all text-text-secondary">{info.remark}</FootnoteText>
        </div>
      )}

      {proxiedWallet && (
        <>
          <Button className="self-start p-0" size="sm" variant="text" onClick={() => setIsOverviewOpen(true)}>
            {t('operations.verifyProxy.details.openProxyDetails')}
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

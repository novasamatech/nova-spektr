import { type PropsWithChildren, memo, useMemo } from 'react';

import { type Account, type Chain, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { DetailRow } from '@/shared/ui/DetailRow/DetailRow';
import { Separator } from '@/shared/ui/Separator/Separator';
import { FootnoteText } from '@/shared/ui/Typography/index';
import { Box } from '@/shared/ui-kit';
import { WalletIcon, walletUtils } from '@/entities/wallet';
import { Account as AccountComponent } from '../Account/Account';
import { AccountExplorers } from '../AccountExplorer/AccountExplorers';

type Props = PropsWithChildren<{
  wallets: Wallet[];
  chain: Chain;
  initiator: Account;
  signatory?: Account;
  proxied?: Account;
}>;

export const TransactionDetails = memo(({ wallets, chain, proxied, initiator, signatory, children }: Props) => {
  const { t } = useI18n();

  const initiatorWallet = useMemo(() => {
    return (
      walletUtils.getWalletFilteredAccounts(wallets, {
        accountFn: (a) => a.accountId === initiator.accountId,
      }) ?? null
    );
  }, [wallets, initiator]);

  const signatoryWallet = useMemo(() => {
    return signatory
      ? (walletUtils.getWalletFilteredAccounts(wallets, {
          accountFn: (a) => a.accountId === signatory.accountId,
        }) ?? null)
      : null;
  }, [wallets, signatory]);

  const proxiedWallet = useMemo(() => {
    return proxied
      ? (walletUtils.getWalletFilteredAccounts(wallets, {
          accountFn: (a) => a.accountId === proxied.accountId,
        }) ?? null)
      : null;
  }, [wallets, proxied]);

  if (!initiatorWallet) {
    return null;
  }

  return (
    <dl className="flex w-full flex-col gap-y-4 text-footnote">
      {!proxiedWallet && (
        <>
          <DetailRow label={t('proxy.details.wallet')} className="flex gap-x-2">
            <WalletIcon type={initiatorWallet.type} size={16} />
            <FootnoteText>{initiatorWallet.name}</FootnoteText>
          </DetailRow>

          <DetailRow label={t('proxy.details.account')}>
            <AccountComponent account={initiator} chain={chain} />
          </DetailRow>
        </>
      )}

      {proxiedWallet && proxied && (
        <>
          <DetailRow label={t('transfer.senderProxiedWallet')}>
            <Box direction="row" gap={2}>
              <WalletIcon type={proxiedWallet.type} size={16} />
              <span>{proxiedWallet.name}</span>
            </Box>
          </DetailRow>

          <DetailRow label={t('transfer.senderProxiedAccount')}>
            <AccountComponent account={proxied} chain={chain} />
          </DetailRow>

          <DetailRow label={t('transfer.signingWallet')}>
            <Box direction="row" gap={2} verticalAlign="center">
              <WalletIcon type={initiatorWallet.type} size={16} />
              <span>{initiatorWallet.name}</span>
            </Box>
          </DetailRow>

          <DetailRow label={t('transfer.signingAccount')}>
            <AccountComponent account={initiator} chain={chain} />
          </DetailRow>
        </>
      )}

      {signatoryWallet && signatory && (
        <DetailRow label={t('proxy.details.signatory')}>
          <Box direction="row" gap={2}>
            <WalletIcon type={signatoryWallet.type} size={16} />
            <span>{signatoryWallet.name}</span>
            <AccountExplorers accountId={signatory.accountId} chain={chain} />
          </Box>
        </DetailRow>
      )}

      {children ? <Separator className="border-filter-border" /> : null}

      {children}
    </dl>
  );
});

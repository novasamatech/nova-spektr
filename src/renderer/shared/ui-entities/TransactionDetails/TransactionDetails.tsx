import { type PropsWithChildren, memo, useMemo } from 'react';

import { useI18n } from '@/app/providers';
import { type Account, type Chain, type Wallet } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { DetailRow, FootnoteText, Separator } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { WalletIcon, walletUtils } from '@/entities/wallet';
import { AccountExplorers } from '../AccountExplorer/AccountExplorers';
import { Address } from '../Address/Address';

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
            <AccountInfo account={initiator} chain={chain} />
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
            <AccountInfo account={proxied} chain={chain} />
          </DetailRow>

          <DetailRow label={t('transfer.signingWallet')}>
            <Box direction="row" gap={2} verticalAlign="center">
              <WalletIcon type={initiatorWallet.type} size={16} />
              <span>{initiatorWallet.name}</span>
            </Box>
          </DetailRow>

          <DetailRow label={t('transfer.signingAccount')}>
            <AccountInfo account={initiator} chain={chain} />
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

const AccountInfo = ({ account, chain }: { account: Account; chain: Chain }) => {
  return (
    <div className="flex w-full min-w-0 gap-2 text-text-secondary">
      <Address showIcon variant="truncate" address={toAddress(account.accountId, { prefix: chain.addressPrefix })} />
      <AccountExplorers accountId={account.accountId} chain={chain} />
    </div>
  );
};

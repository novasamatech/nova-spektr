import { type PropsWithChildren, memo, useMemo } from 'react';

import { type Chain, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { nonNullable } from '@/shared/lib/utils';
import { CaptionText, FootnoteText, Icon, Separator } from '@/shared/ui';
import { DetailRow } from '@/shared/ui/DetailRow/DetailRow';
import { Box } from '@/shared/ui-kit';
import { type AnyAccount } from '@/domains/network';
import { AccountsModal } from '@/entities/staking';
import { WalletIcon, walletUtils } from '@/entities/wallet';
import { Account as AccountComponent } from '../Account/Account';
import { AccountExplorers } from '../AccountExplorers/AccountExplorers';

type Props = PropsWithChildren<{
  wallets: Wallet[];
  chain: Chain;
  initiators: AnyAccount[];
  signatory: AnyAccount | null;
  proxied?: AnyAccount | null;
}>;

export const TransactionDetails = memo(({ wallets, chain, proxied, initiators, signatory, children }: Props) => {
  const { t } = useI18n();

  const [isAccountsOpen, toggleAccounts] = useToggle();

  const initiatorWallet = useMemo(() => {
    return walletUtils.getWalletFilteredAccounts(wallets, {
      accountFn: a => a.id === initiators?.[0]?.id,
    });
  }, [wallets, initiators]);

  const signatoryWallet = useMemo(() => {
    return signatory
      ? walletUtils.getWalletFilteredAccounts(wallets, {
          accountFn: a => a.accountId === signatory.accountId,
        })
      : null;
  }, [wallets, signatory]);

  const proxiedWallet = useMemo(() => {
    return proxied
      ? walletUtils.getWalletFilteredAccounts(wallets, {
          accountFn: a => a.accountId === proxied.accountId,
        })
      : null;
  }, [wallets, proxied]);

  if (!initiatorWallet) {
    return null;
  }

  const shouldRenderProxied = nonNullable(proxiedWallet) && nonNullable(proxied);
  const shouldRenderSignatory =
    nonNullable(signatoryWallet) &&
    nonNullable(signatory) &&
    (initiators.length !== 1 || initiators.every(i => i !== signatory));

  return (
    <dl className="flex w-full flex-col gap-y-4 text-footnote">
      {!proxiedWallet && (
        <>
          <DetailRow label={t('proxy.details.wallet')} className="flex gap-x-2">
            <WalletIcon type={initiatorWallet.type} size={16} />
            <FootnoteText>{initiatorWallet.name}</FootnoteText>
          </DetailRow>

          <DetailRow label={t('proxy.details.account')}>
            {initiators.length === 0 && (
              <div className="rounded-[30px] bg-icon-accent px-1.5 py-[1px]">
                <CaptionText className="text-white">{initiators.length}</CaptionText>
              </div>
            )}
            {initiators.length === 1 && (
              <AccountComponent variant="short" accountId={initiators[0]!.accountId} chain={chain} />
            )}
            {initiators.length > 1 && (
              <button
                type="button"
                className="group flex items-center gap-x-1 rounded px-2 py-1 hover:bg-action-background-hover"
                onClick={toggleAccounts}
              >
                <div className="rounded-[30px] bg-icon-accent px-1.5 py-[1px]">
                  <CaptionText className="text-white">{initiators.length}</CaptionText>
                </div>
                <Icon className="group-hover:text-icon-hover" name="info" size={16} />
              </button>
            )}
          </DetailRow>
        </>
      )}

      {shouldRenderProxied && (
        <>
          <DetailRow label={t('transfer.senderProxiedWallet')}>
            <Box direction="row" gap={2}>
              <WalletIcon type={proxiedWallet.type} size={16} />
              <span>{proxiedWallet.name}</span>
            </Box>
          </DetailRow>

          <DetailRow label={t('transfer.senderProxiedAccount')}>
            <AccountComponent accountId={proxied.accountId} chain={chain} />
          </DetailRow>

          <DetailRow label={t('transfer.signingWallet')}>
            <Box direction="row" gap={2} verticalAlign="center">
              <WalletIcon type={initiatorWallet.type} size={16} />
              <span>{initiatorWallet.name}</span>
            </Box>
          </DetailRow>

          <DetailRow label={t('transfer.signingAccount')}>
            {initiators.length === 1 ? (
              <AccountComponent accountId={initiators[0]!.accountId} chain={chain} />
            ) : (
              <button
                type="button"
                className="group flex items-center gap-x-1 rounded px-2 py-1 hover:bg-action-background-hover"
                onClick={toggleAccounts}
              >
                <div className="rounded-[30px] bg-icon-accent px-1.5 py-[1px]">
                  <CaptionText className="text-white">{initiators.length}</CaptionText>
                </div>
                <Icon className="group-hover:text-icon-hover" name="info" size={16} />
              </button>
            )}
          </DetailRow>
        </>
      )}

      {shouldRenderSignatory && (
        <DetailRow label={t('proxy.details.signatory')}>
          <Box direction="row" gap={2}>
            <WalletIcon type={signatoryWallet.type} size={16} />
            <span>{signatoryWallet.name}</span>
            <AccountExplorers accountId={signatory.accountId} chain={chain} />
          </Box>
        </DetailRow>
      )}

      {nonNullable(children) ? <Separator className="border-filter-border" /> : null}

      {children}

      <AccountsModal
        isOpen={isAccountsOpen}
        accounts={initiators}
        chainId={chain.chainId}
        asset={chain.assets[0]!}
        addressPrefix={chain.addressPrefix}
        onClose={toggleAccounts}
      />
    </dl>
  );
});

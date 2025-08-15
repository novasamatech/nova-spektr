import { type PropsWithChildren, memo, useMemo } from 'react';

import { type Chain, type Wallet } from '@/shared/core';
import { useTransformer } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { CaptionText, DetailRow, FootnoteText, Icon, Separator } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { type AnyAccount } from '@/domains/network';
import { AccountsModal } from '@/entities/staking';
import { walletUtils } from '@/entities/wallet';
// eslint-disable-next-line boundaries/element-types
import { accountNodeConfigTransformer } from '@/sdk/account';
import { Account as AccountComponent } from '../Account/Account';
import { WalletIcon } from '../WalletIcon/WalletIcon';

type Props = PropsWithChildren<{
  wallets: Wallet[];
  chain: Chain;
  initiators: AnyAccount[];
  signatory: AnyAccount;
}>;

export const TransactionDetails = memo(({ wallets, chain, initiators, signatory, children }: Props) => {
  const { t } = useI18n();

  const [isAccountsOpen, toggleAccounts] = useToggle();

  const firstInitiator = initiators.at(0);
  const initiatorWallet = useMemo(() => {
    if (nullable(firstInitiator)) return null;
    return walletUtils.getWalletFilteredAccounts(wallets, {
      walletFn: w => w.id === firstInitiator.walletId,
      accountFn: a => a.accountId === firstInitiator.accountId,
    });
  }, [wallets, firstInitiator]);

  const signatoryWallet = useMemo(() => {
    return walletUtils.getWalletFilteredAccounts(wallets, {
      walletFn: w => w.id === signatory.walletId,
      accountFn: a => a.accountId === signatory.accountId,
    });
  }, [wallets, signatory]);

  const initiatorMeta = useTransformer(accountNodeConfigTransformer, { account: firstInitiator || signatory, t });
  const initiatorWalletType = initiatorMeta ? initiatorMeta.title.toLowerCase() : '';
  const isComplexAccountStructure = nullable(initiators.find(i => i === signatory));

  return (
    <dl className="flex w-full flex-col gap-y-4 text-footnote">
      {!isComplexAccountStructure && (
        <>
          {nonNullable(initiatorWallet) && (
            <DetailRow label={t('transaction.details.wallet')} className="flex gap-x-2">
              <WalletIcon type={initiatorWallet.type} size={16} />
              <FootnoteText>{initiatorWallet.name}</FootnoteText>
            </DetailRow>
          )}

          <DetailRow label={t('transaction.details.account')}>
            {initiators.length === 0 && (
              <div className="rounded-[30px] bg-icon-accent px-1.5 py-px">
                <CaptionText className="text-white">{initiators.length}</CaptionText>
              </div>
            )}
            {initiators.length === 1 && nonNullable(firstInitiator) && (
              <AccountComponent variant="short" accountId={firstInitiator.accountId} chain={chain} />
            )}
            {initiators.length > 1 && (
              <button
                type="button"
                className="group flex items-center gap-x-1 rounded-sm px-2 py-1 hover:bg-action-background-hover"
                onClick={toggleAccounts}
              >
                <div className="rounded-[30px] bg-icon-accent px-1.5 py-px">
                  <CaptionText className="text-white">{initiators.length}</CaptionText>
                </div>
                <Icon className="group-hover:text-icon-hover" name="info" size={16} />
              </button>
            )}
          </DetailRow>
        </>
      )}

      {isComplexAccountStructure && (
        <>
          {nonNullable(initiatorWallet) && (
            <DetailRow label={t('transaction.details.initiatorWallet', { type: initiatorWalletType })}>
              <Box direction="row" gap={2}>
                <WalletIcon type={initiatorWallet.type} size={16} />
                <span>{initiatorWallet.name}</span>
              </Box>
            </DetailRow>
          )}

          {nonNullable(firstInitiator) && (
            <DetailRow label={t('transaction.details.initiatorAccount', { type: initiatorWalletType })}>
              <AccountComponent accountId={firstInitiator.accountId} chain={chain} />
            </DetailRow>
          )}

          <Separator className="border-filter-border" />

          {nonNullable(signatoryWallet) && (
            <DetailRow label={t('transaction.details.sinatoryWallet')}>
              <Box direction="row" gap={2} verticalAlign="center">
                <WalletIcon type={signatoryWallet.type} size={16} />
                <span>{signatoryWallet.name}</span>
              </Box>
            </DetailRow>
          )}

          {nonNullable(signatory) && (
            <DetailRow label={t('transaction.details.sinatoryAccount')}>
              <AccountComponent accountId={signatory?.accountId} chain={chain} />{' '}
            </DetailRow>
          )}
        </>
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

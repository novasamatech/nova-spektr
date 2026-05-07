import { useUnit } from 'effector-react';
import { type ReactNode, useCallback, useMemo, useState } from 'react';

import {
  type Chain,
  type FlexibleMultisigAccount,
  type MultisigAccount,
  type Signatory,
  type Wallet,
} from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { nonNullable, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { BodyText, Button, CaptionText, FootnoteText, Icon, SmallTitleText } from '@/shared/ui';
import { Address, WalletIcon } from '@/shared/ui-entities';
import {
  type AnyAccount,
  type MultisigOperation,
  accounts,
  isContactMultisigAccount,
  useAccountName,
} from '@/domains/network';
import { useChain } from '@/entities/network';
import { operationDetailsUtils } from '@/entities/operations';
import { SignatoryCard } from '@/entities/signatory';
import { accountUtils, walletModel } from '@/entities/wallet';
import { WalletName } from '@/widgets/NameResolver';

import LogModal from './LogModal';

type SignatoryAddressProps = {
  accountId: AccountId;
  chain: Chain | null;
};

const SignatoryAddress = ({ accountId, chain }: SignatoryAddressProps) => {
  const name = useAccountName({ accountId, chain });

  return (
    <Address
      title={name}
      address={toAddress(accountId, { prefix: chain?.addressPrefix })}
      variant="short"
      canCopy
      showIcon
    />
  );
};

export const operationOverviewSlot = createSlot<{
  walletAccounts: AnyAccount[];
  trigger?: ReactNode;
  initialChainId?: string;
  exclusive?: boolean;
}>();

type WalletSignatory = Signatory & { wallet: Wallet };

type Props = {
  operation: MultisigOperation;
  account: MultisigAccount | FlexibleMultisigAccount;
};

export const OperationSignatories = ({ operation, account }: Props) => {
  const { t } = useI18n();
  const chain = useChain(operation.chainId);

  const wallets = useUnit(walletModel.$wallets);
  const accountsList = useUnit(accounts.$list);

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const closeLogModal = useCallback(() => setIsLogModalOpen(false), []);

  const approvals = operation.events.filter(e => e.status === 'approve');
  const cancellation = operation.events.filter(e => e.status === 'reject');

  const signatoriesList = useMemo(() => {
    const tempCancellation = [];

    if (cancellation.length) {
      const cancelSignatories = account.signatories.find(s => s.accountId === cancellation[0]!.accountId);
      if (cancelSignatories) {
        tempCancellation.push(cancelSignatories);
      }
    }

    const tempApprovals = approvals
      .sort((a, b) => (a.blockCreated || 0) - (b.blockCreated || 0))
      .map(a => account.signatories.find(s => s.accountId === a.accountId))
      .filter(nonNullable);

    return [...new Set<Signatory>([...tempCancellation, ...tempApprovals, ...account.signatories])];
  }, [account.signatories.length, approvals.length, cancellation.length]);

  const walletSignatories: WalletSignatory[] = signatoriesList.reduce((acc: WalletSignatory[], signatory) => {
    const signatoryAccounts = accountsList.filter(account => account.accountId === signatory.accountId);
    const signatoryWallet = wallets.find(w => signatoryAccounts.some(account => account.walletId === w.id));

    if (signatoryWallet) {
      acc.push({ ...signatory, wallet: signatoryWallet });
    }

    return acc;
  }, []);

  const walletSignatoriesIds = walletSignatories.map(a => a.accountId);
  const contactSignatories = account.signatories.filter(s => !walletSignatoriesIds.includes(s.accountId));

  // Contact-backed external multisigs aren't part of the user's account
  // graph, so the "Open overview" structure view has nothing meaningful to
  // visualize — hide the trigger.
  const isExternalMultisig = isContactMultisigAccount(account);

  // Flex multisig overview: render proxied → multisig (hidden-wallet accounts).
  const overviewAccounts = useMemo<AnyAccount[]>(() => {
    if (!accountUtils.isFlexibleMultisigAccount(account)) return [account];

    const proxied = accountsList.filter(accountUtils.isProxiedAccount).find(a => a.accountId === account.accountId);
    const multisig = accountsList
      .filter(accountUtils.isMultisigAccount)
      .find(a => a.accountId === account.multisigAccountId);

    if (!proxied || !multisig) return [account];

    return [proxied, multisig];
  }, [account, accountsList]);

  return (
    <div className="flex flex-col border-r border-divider p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SmallTitleText>{t('operation.signatoriesTitle')}</SmallTitleText>
          <Button
            pallet="secondary"
            variant="fill"
            size="sm"
            prefixElement={<Icon name="chat" size={16} />}
            suffixElement={
              <CaptionText className="rounded-full bg-chip-icon px-1.5 pt-px pb-[2px] text-white!">
                {operation.events.length}
              </CaptionText>
            }
            onClick={() => setIsLogModalOpen(true)}
          >
            {t('operation.logButton')}
          </Button>
        </div>
        {!isExternalMultisig && (
          <Slot
            id={operationOverviewSlot}
            props={{
              walletAccounts: overviewAccounts,
              initialChainId: operation.chainId,
              exclusive: accountUtils.isFlexibleMultisigAccount(account),
              trigger: (
                <Button pallet="primary" variant="text" size="sm">
                  {t('operation.openOverviewButton')}
                </Button>
              ),
            }}
          />
        )}
      </div>

      <div className="flex flex-col gap-y-2">
        {Boolean(walletSignatories.length) && (
          <div>
            <FootnoteText className="text-text-tertiary" as="h4">
              {t('operation.walletSignatoriesTitle')}
            </FootnoteText>
            <ul className="flex flex-col">
              {walletSignatories.map(signatory => (
                <SignatoryCard
                  key={signatory.accountId}
                  status={operationDetailsUtils.getSignatoryStatus(operation.events, signatory.accountId)}
                >
                  <WalletIcon type={signatory.wallet.type} size={20} />
                  <BodyText className="mr-auto truncate text-inherit">
                    <WalletName wallet={signatory.wallet} />
                  </BodyText>
                </SignatoryCard>
              ))}
            </ul>
          </div>
        )}

        {Boolean(contactSignatories.length) && (
          <div>
            <FootnoteText className="text-text-tertiary" as="h4">
              {t('operation.contactSignatoriesTitle')}
            </FootnoteText>
            <ul className="flex flex-col">
              {contactSignatories.map(signatory => (
                <SignatoryCard
                  key={signatory.accountId}
                  status={operationDetailsUtils.getSignatoryStatus(operation.events, signatory.accountId)}
                >
                  <SignatoryAddress accountId={signatory.accountId} chain={chain} />
                </SignatoryCard>
              ))}
            </ul>
          </div>
        )}
      </div>

      <LogModal isOpen={isLogModalOpen} operation={operation} account={account} chain={chain} onClose={closeLogModal} />
    </div>
  );
};

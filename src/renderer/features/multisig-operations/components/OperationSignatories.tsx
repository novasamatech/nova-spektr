import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type FlexibleMultisigAccount, type MultisigAccount, type Signatory, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { nonNullable, toAddress } from '@/shared/lib/utils';
import { BodyText, Button, CaptionText, FootnoteText, Icon, SmallTitleText } from '@/shared/ui';
import { Address, WalletIcon } from '@/shared/ui-entities';
import { type MultisigOperation, accounts } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { type ExtendedChain } from '@/entities/network';
import { operationDetailsUtils } from '@/entities/operations';
import { SignatoryCard } from '@/entities/signatory';
import { walletModel } from '@/entities/wallet';

import LogModal from './LogModal';

type WalletSignatory = Signatory & { wallet: Wallet };

type Props = {
  operation: MultisigOperation;
  connection: ExtendedChain;
  account: MultisigAccount | FlexibleMultisigAccount;
};

export const OperationSignatories = ({ operation, connection, account }: Props) => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);
  const accountsList = useUnit(accounts.$list);
  const contacts = useUnit(contactModel.$contacts);

  const [isLogModalOpen, toggleLogModal] = useToggle();

  const approvals = operation.events.filter(e => e.status === 'approve');
  const cancellation = operation.events.filter(e => e.status === 'reject');

  const signatoriesList = useMemo(() => {
    const tempCancellation = [];

    if (cancellation.length) {
      const cancelSignatories = account.signatories.find(s => s.accountId === cancellation[0].accountId);
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

  return (
    <div className="flex w-[320px] flex-col px-2 py-4">
      <div className="mb-3 flex items-center justify-between">
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
          onClick={toggleLogModal}
        >
          {t('operation.logButton')}
        </Button>
      </div>

      <div className="flex flex-col gap-y-2">
        {Boolean(walletSignatories.length) && (
          <>
            <FootnoteText className="mb-2 text-text-tertiary" as="h4">
              {t('operation.walletSignatoriesTitle')}
            </FootnoteText>
            <ul className="flex flex-col gap-y-2">
              {walletSignatories.map(signatory => (
                <SignatoryCard
                  key={signatory.accountId}
                  accountId={signatory.accountId}
                  addressPrefix={connection.addressPrefix}
                  status={operationDetailsUtils.getSignatoryStatus(operation.events, signatory.accountId)}
                  explorers={connection.explorers}
                >
                  <WalletIcon type={signatory.wallet.type} size={20} />
                  <BodyText className="mr-auto truncate text-inherit">{signatory.wallet.name}</BodyText>
                </SignatoryCard>
              ))}
            </ul>
          </>
        )}

        {Boolean(contactSignatories.length) && (
          <>
            <FootnoteText className="mb-2 text-text-tertiary" as="h4">
              {t('operation.contactSignatoriesTitle')}
            </FootnoteText>
            <ul className="flex flex-col gap-y-2">
              {contactSignatories.map(signatory => (
                <SignatoryCard
                  key={signatory.accountId}
                  accountId={signatory.accountId}
                  addressPrefix={connection.addressPrefix}
                  status={operationDetailsUtils.getSignatoryStatus(operation.events, signatory.accountId)}
                  explorers={connection.explorers}
                >
                  <Address
                    title={operationDetailsUtils.getSignatoryName(
                      signatory.accountId,
                      account.signatories,
                      contacts,
                      wallets,
                      connection.addressPrefix,
                    )}
                    address={toAddress(signatory.accountId, { prefix: connection.addressPrefix })}
                    variant="short"
                    canCopy={false}
                    showIcon
                  />
                </SignatoryCard>
              ))}
            </ul>
          </>
        )}
      </div>

      <LogModal
        isOpen={isLogModalOpen}
        operation={operation}
        account={account}
        connection={connection}
        contacts={contacts}
        onClose={toggleLogModal}
      />
    </div>
  );
};

import { useEffect, useState } from 'react';
import { useUnit } from 'effector-react';

import { BodyText, Button, CaptionText, FootnoteText, Icon, SmallTitleText } from '@renderer/shared/ui';
import { AddressWithName, WalletIcon, walletModel } from '@renderer/entities/wallet';
import { getSignatoryName } from '@renderer/pages/Operations/common/utils';
import { AccountId, MultisigAccount, Signatory, Wallet } from '@renderer/shared/core';
import { MultisigEvent, MultisigTransaction, SigningStatus } from '@renderer/entities/transaction';
import { ExtendedChain } from '@renderer/entities/network';
import { useI18n } from '@renderer/app/providers';
import { useToggle } from '@renderer/shared/lib/hooks';
import { nonNullable } from '@renderer/shared/lib/utils';
import { contactModel } from '@renderer/entities/contact';
import LogModal from './LogModal';
import { useMultisigEvent } from '@renderer/entities/multisig';

const SIGNATORY_STATUS_ICON: Partial<Record<SigningStatus, () => JSX.Element>> = {
  ['SIGNED']: () => <Icon size={16} name="checkLineRedesign" className="text-text-positive" />,
  ['CANCELLED']: () => <Icon size={16} name="closeLineRedesign" className="text-text-negative" />,
};

type WalletSignatory = Signatory & { wallet: Wallet };

type Props = {
  tx: MultisigTransaction;
  connection: ExtendedChain;
  account: MultisigAccount;
};

export const OperationSignatories = ({ tx, connection, account }: Props) => {
  const { t } = useI18n();
  const { getLiveTxEvents } = useMultisigEvent({});

  const { signatories, accountId, chainId, callHash, blockCreated, indexCreated } = tx;
  const events = getLiveTxEvents(accountId, chainId, callHash, blockCreated, indexCreated);

  const contacts = useUnit(contactModel.$contacts);
  const accounts = useUnit(walletModel.$accounts);
  const walletsMap = new Map(useUnit(walletModel.$wallets).map((w) => [w.id, w]));

  const [isLogModalOpen, toggleLogModal] = useToggle();
  const [signatoriesList, setSignatories] = useState<Signatory[]>([]);

  const approvals = events.filter((e) => e.status === 'SIGNED');
  const cancellation = events.filter((e) => e.status === 'CANCELLED');

  const walletSignatories: WalletSignatory[] = signatoriesList.reduce((acc: WalletSignatory[], signatory) => {
    const signatoryAccount = accounts.find((a) => signatory.accountId === a.accountId);
    const signatoryWallet = signatoryAccount && walletsMap.get(signatoryAccount.walletId);

    if (signatoryAccount && signatoryWallet) {
      acc.push({ ...signatory, wallet: signatoryWallet });
    }

    return acc;
  }, []);

  const accountsIds = accounts.map((a) => a.accountId);
  const contactSignatories = signatories.filter((s) => !accountsIds.includes(s.accountId));

  useEffect(() => {
    const tempCancellation = [];

    if (cancellation.length) {
      const cancelSignatories = signatories.find((s) => s.accountId === cancellation[0].accountId);
      cancelSignatories && tempCancellation.push(cancelSignatories);
    }

    const tempApprovals = approvals
      .sort((a: MultisigEvent, b: MultisigEvent) => (a.eventBlock || 0) - (b.eventBlock || 0))
      .map((a) => signatories.find((s) => s.accountId === a.accountId))
      .filter(nonNullable);

    setSignatories([...new Set<Signatory>([...tempCancellation, ...tempApprovals, ...signatories])]);
  }, [signatories.length, approvals.length, cancellation.length]);

  const getSignatoryStatus = (signatory: AccountId): SigningStatus | undefined => {
    const cancelEvent = events.find((e) => e.status === 'CANCELLED' && e.accountId === signatory);
    if (cancelEvent) {
      return cancelEvent.status;
    }
    const signedEvent = events.find((e) => e.status === 'SIGNED' && e.accountId === signatory);

    return signedEvent?.status;
  };

  return (
    <div className="flex flex-col w-[320px] px-2 py-4">
      <div className="flex justify-between items-center mb-3">
        <SmallTitleText>{t('operation.signatoriesTitle')}</SmallTitleText>

        <Button
          pallet="secondary"
          variant="fill"
          size="sm"
          prefixElement={<Icon name="chatRedesign" size={16} />}
          suffixElement={
            <CaptionText className="!text-white bg-chip-icon rounded-full pt-[1px] pb-[2px] px-1.5">
              {events.length}
            </CaptionText>
          }
          onClick={toggleLogModal}
        >
          {t('operation.logButton')}
        </Button>
      </div>

      <div className="flex flex-col gap-y-2">
        <FootnoteText className="text-text-tertiary mb-2" as="h4">
          {t('operation.walletSignatoriesTitle')}
        </FootnoteText>
        <ul className="flex flex-col gap-y-2">
          {walletSignatories.map((signatory) => {
            const signatoryStatus = getSignatoryStatus(signatory.accountId);
            const statusIcon = signatoryStatus && SIGNATORY_STATUS_ICON[signatoryStatus];

            return (
              <div key={signatory.accountId} className="flex gap-x-2 px-2 py-1.5 items-center">
                <WalletIcon type={signatory.wallet.type} size={20} />
                <BodyText className="text-text-secondary mr-auto">{signatory.wallet.name}</BodyText>
                {statusIcon && statusIcon()}
              </div>
            );
          })}
        </ul>

        {Boolean(contactSignatories.length) && (
          <>
            <FootnoteText className="text-text-tertiary mb-2" as="h4">
              {t('operation.contactSignatoriesTitle')}
            </FootnoteText>
            <ul className="flex flex-col gap-y-2">
              {contactSignatories.map((signatory) => {
                const signatoryStatus = getSignatoryStatus(signatory.accountId);
                const statusIcon = signatoryStatus && SIGNATORY_STATUS_ICON[signatoryStatus];

                return (
                  <div key={signatory.accountId} className="flex gap-x-2 px-2 py-1.5 items-center">
                    <AddressWithName
                      name={getSignatoryName(
                        signatory.accountId,
                        signatories,
                        contacts,
                        accounts,
                        connection.addressPrefix,
                      )}
                      symbols={8}
                      type="short"
                      addressFont="text-text-secondary"
                      accountId={signatory.accountId}
                      addressPrefix={connection.addressPrefix}
                    />
                    {statusIcon && statusIcon()}
                  </div>
                );
              })}
            </ul>
          </>
        )}
      </div>

      <LogModal
        isOpen={isLogModalOpen}
        tx={tx}
        account={account}
        connection={connection}
        accounts={accounts}
        contacts={contacts}
        onClose={toggleLogModal}
      />
    </div>
  );
};

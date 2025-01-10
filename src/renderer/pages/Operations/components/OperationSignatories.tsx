import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import {
  type FlexibleMultisigAccount,
  type FlexibleMultisigTransaction,
  type MultisigAccount,
  type MultisigEvent,
  type MultisigTransaction,
  type Signatory,
  type Wallet,
} from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { nonNullable, toAddress } from '@/shared/lib/utils';
import { BodyText, Button, CaptionText, FootnoteText, Icon, SmallTitleText } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { contactModel } from '@/entities/contact';
import { useMultisigEvent } from '@/entities/multisig';
import { type ExtendedChain } from '@/entities/network';
import { SignatoryCard, signatoryUtils } from '@/entities/signatory';
import { WalletIcon, walletModel } from '@/entities/wallet';
import { getSignatoryName, getSignatoryStatus } from '../common/utils';

import LogModal from './LogModal';

type WalletSignatory = Signatory & { wallet: Wallet };

type Props = {
  tx: MultisigTransaction | FlexibleMultisigTransaction;
  connection: ExtendedChain;
  account: MultisigAccount | FlexibleMultisigAccount;
};

export const OperationSignatories = ({ tx, connection, account }: Props) => {
  const { t } = useI18n();
  const { getLiveTxEvents } = useMultisigEvent({});

  const { signatories, accountId, chainId, callHash, blockCreated, indexCreated } = tx;
  const events = getLiveTxEvents(accountId, chainId, callHash, blockCreated, indexCreated);

  const wallets = useUnit(walletModel.$wallets);
  const contacts = useUnit(contactModel.$contacts);

  const [isLogModalOpen, toggleLogModal] = useToggle();
  const [signatoriesList, setSignatories] = useState<Signatory[]>([]);

  const approvals = events.filter((e) => e.status === 'SIGNED');
  const cancellation = events.filter((e) => e.status === 'CANCELLED');

  const walletSignatories: WalletSignatory[] = signatoriesList.reduce((acc: WalletSignatory[], signatory) => {
    const signatoryWallet = signatoryUtils.getSignatoryWallet(wallets, signatory.accountId);

    if (signatoryWallet) {
      acc.push({ ...signatory, wallet: signatoryWallet });
    }

    return acc;
  }, []);

  const walletSignatoriesIds = walletSignatories.map((a) => a.accountId);
  const contactSignatories = signatories.filter((s) => !walletSignatoriesIds.includes(s.accountId));

  useEffect(() => {
    const tempCancellation = [];

    if (cancellation.length) {
      const cancelSignatories = signatories.find((s) => s.accountId === cancellation[0].accountId);
      if (cancelSignatories) {
        tempCancellation.push(cancelSignatories);
      }
    }

    const tempApprovals = approvals
      .sort((a: MultisigEvent, b: MultisigEvent) => (a.eventBlock || 0) - (b.eventBlock || 0))
      .map((a) => signatories.find((s) => s.accountId === a.accountId))
      .filter(nonNullable);

    setSignatories([...new Set<Signatory>([...tempCancellation, ...tempApprovals, ...signatories])]);
  }, [signatories.length, approvals.length, cancellation.length]);

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
            <CaptionText className="rounded-full bg-chip-icon px-1.5 pb-[2px] pt-[1px] !text-white">
              {events.length}
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
              {walletSignatories.map((signatory) => (
                <SignatoryCard
                  key={signatory.accountId}
                  accountId={signatory.accountId}
                  addressPrefix={connection.addressPrefix}
                  status={getSignatoryStatus(events, signatory.accountId)}
                  explorers={connection.explorers}
                >
                  <WalletIcon type={signatory.wallet.type} size={20} />
                  <BodyText className="mr-auto text-inherit">{signatory.wallet.name}</BodyText>
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
              {contactSignatories.map((signatory) => (
                <SignatoryCard
                  key={signatory.accountId}
                  accountId={signatory.accountId}
                  addressPrefix={connection.addressPrefix}
                  status={getSignatoryStatus(events, signatory.accountId)}
                  explorers={connection.explorers}
                >
                  <Address
                    title={getSignatoryName(
                      signatory.accountId,
                      signatories,
                      contacts,
                      wallets,
                      connection.addressPrefix,
                    )}
                    address={toAddress(signatory.accountId)}
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
        tx={tx}
        account={account}
        connection={connection}
        contacts={contacts}
        onClose={toggleLogModal}
      />
    </div>
  );
};

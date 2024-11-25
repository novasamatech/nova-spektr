import { useUnit } from 'effector-react';

import { type FlexibleMultisigTransactionDS } from '@/shared/api/storage';
import {
  type FlexibleMultisigAccount,
  type MultisigEvent,
  type Signatory,
  type SigningStatus,
  type Wallet,
} from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Accordion, BodyText, Button, CaptionText, Header, Plate, SmallTitleText } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { Box, Progress } from '@/shared/ui-kit';
import { contactModel } from '@/entities/contact';
import { useMultisigEvent } from '@/entities/multisig';
import { type ExtendedChain, useNetworkData } from '@/entities/network';
import { SignatoryCard, signatoryUtils } from '@/entities/signatory';
import { WalletIcon, permissionUtils, walletModel } from '@/entities/wallet';
import { getSignatoryName, getSignatoryStatus } from '../common/utils';

import { Status } from './Status';
import ApproveTxModal from './modals/ApproveTx';
import RejectTxModal from './modals/RejectTx';

type Props = {
  tx: FlexibleMultisigTransactionDS;
  account: FlexibleMultisigAccount;
};

export const FlexibleMultisigShell = ({ tx, account }: Props) => {
  const { t } = useI18n();
  const { connection, extendedChain } = useNetworkData(tx.chainId);

  const wallets = useUnit(walletModel.$wallets);
  const { getLiveEventsByKeys } = useMultisigEvent({});

  const events = getLiveEventsByKeys([tx]);
  const approvals = events?.filter((e) => e.status === 'SIGNED') || [];

  const isRejectAvailable = wallets.some((wallet) => {
    const hasDepositor = wallet.accounts.some((account) => account.accountId === tx.depositor);

    return hasDepositor && permissionUtils.canRejectMultisigTx(wallet);
  });

  return (
    <div className="relative flex h-full flex-col items-center">
      <Header title={t('operations.title')} />

      <Plate className="mt-6 flex w-92 flex-col gap-6 rounded-2xl border-filter-border p-6">
        <Box gap={4}>
          <Box horizontalAlign="center">
            <Status status={tx.status} signed={approvals.length} threshold={account.threshold ?? approvals.length} />
          </Box>

          <SmallTitleText align="center">{t('operation.createFlexibleMultisig.title')}</SmallTitleText>

          <Progress value={approvals.length} max={account.threshold ?? approvals.length} />

          <BodyText className="text-text-tertiary" align="center">
            {t('operation.createFlexibleMultisig.description')}
          </BodyText>
        </Box>

        <div className="flex items-center">
          {connection && isRejectAvailable && (
            <RejectTxModal tx={tx} account={account} connection={extendedChain}>
              <Button pallet="error" variant="fill">
                {t('operation.rejectButton')}
              </Button>
            </RejectTxModal>
          )}
          {connection && (
            <ApproveTxModal tx={tx} account={account} connection={extendedChain}>
              <Button className="ml-auto">{t('operation.approveButton')}</Button>
            </ApproveTxModal>
          )}
        </div>
        <Signatories signatories={tx.signatories} connection={extendedChain} events={events} />

        {/* TODO: add details */}
      </Plate>
    </div>
  );
};

type SignatoriesParams = {
  signatories: Signatory[];
  connection: ExtendedChain;
  events: MultisigEvent[];
};
type WalletSignatory = Signatory & {
  wallet: Wallet;
  status: SigningStatus | undefined;
};

const Signatories = ({ signatories, connection, events }: SignatoriesParams) => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);
  const contacts = useUnit(contactModel.$contacts);

  const walletSignatories = signatories
    .reduce<WalletSignatory[]>((acc, signatory) => {
      const signatoryWallet = signatoryUtils.getSignatoryWallet(wallets, signatory.accountId);
      const status = getSignatoryStatus(events, signatory.accountId);

      if (signatoryWallet) {
        acc.push({ ...signatory, wallet: signatoryWallet, status });
      }

      return acc;
    }, [])
    .sort((wallet) => (wallet.status === 'SIGNED' ? -1 : 1));

  const walletSignatoriesIds = walletSignatories.map((a) => a.accountId);
  const contactSignatories = signatories.filter((s) => !walletSignatoriesIds.includes(s.accountId));

  return (
    <Accordion>
      <Accordion.Button buttonClass="px-2 py-1.5 mb-3">
        <CaptionText className="uppercase text-text-secondary">
          {t('operation.signatoriesTitleCount', { count: signatories.length })}
        </CaptionText>
      </Accordion.Button>
      <Accordion.Content>
        <div className="flex flex-col">
          {walletSignatories.length > 0 && (
            <ul className="flex flex-col gap-y-2">
              {walletSignatories.map((signatory) => (
                <SignatoryCard
                  key={signatory.accountId}
                  accountId={signatory.accountId}
                  addressPrefix={connection.addressPrefix}
                  status={signatory.status}
                  explorers={connection.explorers}
                >
                  <div className="flex w-[100px] grow items-center gap-x-2 text-text-secondary">
                    <WalletIcon type={signatory.wallet.type} size={20} />
                    <Address
                      title={signatory.wallet.name}
                      address={signatory.address}
                      showIcon={false}
                      variant="truncate"
                    />
                  </div>
                </SignatoryCard>
              ))}

              {contactSignatories.length > 0 && (
                <>
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
                        variant="short"
                        address={signatory.address}
                      />
                    </SignatoryCard>
                  ))}
                </>
              )}
            </ul>
          )}
        </div>
      </Accordion.Content>
    </Accordion>
  );
};

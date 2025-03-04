import { type ApiPromise } from '@polkadot/api';
import { useUnit } from 'effector-react';
import { memo } from 'react';

import { type Chain, type MultisigAccount, type Signatory, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { BodyText, Button, FootnoteText, Header, Plate, SmallTitleText } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { Accordion, Box, Modal, Progress } from '@/shared/ui-kit';
import { type MultisigEvent, type MultisigOperation } from '@/domains/multisig';
import { contactModel } from '@/entities/contact';
import { type ExtendedChain, useNetworkData } from '@/entities/network';
import { Status, operationDetailsUtils } from '@/entities/operations';
import { SignatoryCard, signatoryUtils } from '@/entities/signatory';
import { WalletIcon, permissionUtils, walletModel } from '@/entities/wallet';
import { flexibleShellModel } from '../model/flexible-shell-model';

import { OperationAdvancedDetails } from './OperationAdvancedDetails';
import ApproveTxModal from './modals/ApproveTx';
import RejectTxModal from './modals/RejectTx';

type Props = {
  tx: MultisigOperation;
  account: MultisigAccount;
};

export const FlexibleMultisigShell = memo(({ tx, account }: Props) => {
  const { t } = useI18n();
  const { connection, chain, api, extendedChain } = useNetworkData(tx.chainId);

  const events = tx.events;

  const wallets = useUnit(walletModel.$wallets);
  const signatories = account.signatories;
  const isRejectAvailable = wallets.some(wallet => {
    const hasDepositor = wallet.accounts.some(account => account.accountId === tx.depositor);

    return hasDepositor && permissionUtils.canRejectMultisigTx(wallet) && tx.status === 'pending';
  });

  const approvals = events.filter(e => e.status === 'approve');

  return (
    <div className="relative flex h-full flex-col items-center overflow-y-auto">
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
            <ConfirmReject api={api} tx={tx} account={account} chain={chain}>
              <Button pallet="error" variant="fill">
                {t('operation.rejectButton')}
              </Button>
            </ConfirmReject>
          )}
          {connection && (
            <ApproveTxModal api={api} tx={tx} account={account} chain={chain}>
              <Button className="ml-auto">{t('operation.approveButton')}</Button>
            </ApproveTxModal>
          )}
        </div>
        <Signatories signatories={signatories} connection={extendedChain} events={events} chain={extendedChain} />

        <Details tx={tx} chain={extendedChain} />
      </Plate>
    </div>
  );
});

type SignatoriesParams = {
  signatories: Signatory[];
  connection: ExtendedChain;
  events: MultisigEvent[];
  chain: Chain;
};
type WalletSignatory = Signatory & {
  wallet: Wallet;
  status: MultisigEvent['status'] | null;
};

const Signatories = memo(({ signatories, connection, events, chain }: SignatoriesParams) => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);
  const contacts = useUnit(contactModel.$contacts);

  const walletSignatories = signatories
    .reduce<WalletSignatory[]>((acc, signatory) => {
      const signatoryWallet = signatoryUtils.getSignatoryWallet(wallets, signatory.accountId);
      const status = operationDetailsUtils.getSignatoryStatus(events, signatory.accountId);

      if (signatoryWallet) {
        acc.push({ ...signatory, wallet: signatoryWallet, status });
      }

      return acc;
    }, [])
    .sort(wallet => (wallet.status === 'approve' ? -1 : 1));

  const walletSignatoriesIds = walletSignatories.map(a => a.accountId);
  const contactSignatories = signatories.filter(s => !walletSignatoriesIds.includes(s.accountId));

  return (
    <Accordion>
      <Accordion.Trigger>{t('operation.signatoriesTitleCount', { count: signatories.length })}</Accordion.Trigger>
      <Accordion.Content>
        <div className="mt-3 flex flex-col">
          {walletSignatories.length > 0 && (
            <ul className="flex flex-col gap-y-2">
              {walletSignatories.map(signatory => (
                <SignatoryCard
                  key={signatory.accountId}
                  accountId={signatory.accountId}
                  addressPrefix={connection.addressPrefix}
                  status={signatory.status}
                  explorers={connection.explorers}
                >
                  <div className="flex w-44 grow items-center gap-x-2 text-text-secondary">
                    <WalletIcon type={signatory.wallet.type} size={20} />
                    <Address
                      title={signatory.wallet.name}
                      address={toAddress(signatory.accountId)}
                      showIcon={false}
                      variant="truncate"
                    />
                  </div>
                </SignatoryCard>
              ))}

              {contactSignatories.map(signatory => (
                <SignatoryCard
                  key={signatory.accountId}
                  accountId={signatory.accountId}
                  addressPrefix={connection.addressPrefix}
                  status={operationDetailsUtils.getSignatoryStatus(events, signatory.accountId)}
                  explorers={connection.explorers}
                >
                  <Address
                    title={operationDetailsUtils.getSignatoryName(
                      signatory.accountId,
                      signatories,
                      contacts,
                      wallets,
                      connection.addressPrefix,
                    )}
                    variant="short"
                    address={toAddress(signatory.accountId, { prefix: chain.addressPrefix })}
                  />
                </SignatoryCard>
              ))}
            </ul>
          )}
        </div>
      </Accordion.Content>
    </Accordion>
  );
});

const Details = ({ tx, chain }: { tx: MultisigOperation; chain: Chain }) => {
  const { t } = useI18n();
  const wallets = useUnit(walletModel.$wallets);

  return (
    <Accordion>
      <Accordion.Trigger>{t('operation.detailsTitle')}</Accordion.Trigger>
      <Accordion.Content>
        <div className="mt-3">
          <OperationAdvancedDetails tx={tx} chain={chain} wallets={wallets} />
        </div>
      </Accordion.Content>
    </Accordion>
  );
};

type ConfirmRejectParams = {
  api: ApiPromise;
  tx: MultisigOperation;
  account: MultisigAccount;
  chain: Chain;
  children: React.ReactNode;
};

const ConfirmReject = ({ api, tx, account, chain, children }: ConfirmRejectParams) => {
  const { t } = useI18n();
  const isRejectConfirmOpen = useUnit(flexibleShellModel.$isRejectConfirmOpen);

  return (
    <Modal
      size="fit"
      isOpen={isRejectConfirmOpen}
      onToggle={open => flexibleShellModel.events.toggleRejectModalConfirm(open)}
    >
      <Modal.Title>
        <div className="text-wrap text-center text-small-title">
          {t('operation.createFlexibleMultisig.rejectConfirmTitle')}
        </div>
      </Modal.Title>
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Content>
        <div className="w-[240px] px-4">
          <FootnoteText className="text-center text-text-tertiary">
            {t('operation.createFlexibleMultisig.rejectConfirmDescription')}
          </FootnoteText>
        </div>
      </Modal.Content>
      <Modal.Footer>
        <div className="flex w-full gap-x-2">
          <Button
            size="sm"
            pallet="secondary"
            className="w-full"
            onClick={() => flexibleShellModel.events.toggleRejectModalConfirm(false)}
          >
            {t('general.button.cancelButton')}
          </Button>
          <RejectTxModal api={api} tx={tx} account={account} chain={chain}>
            <Button size="sm" className="w-full" pallet="error" variant="fill">
              {t('operation.rejectButton')}
            </Button>
          </RejectTxModal>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

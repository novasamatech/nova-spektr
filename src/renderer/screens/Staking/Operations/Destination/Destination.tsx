import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { toAddress } from '@renderer/shared/utils/address';
import { getRelaychainAsset } from '@renderer/shared/utils/assets';
import { RewardsDestination } from '@renderer/domain/stake';
import { ChainLoader } from '@renderer/components/common';
import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { useChains } from '@renderer/services/network/chainsService';
import { Address, ChainId, HexString, AccountId } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { Confirmation, Signing, Submit, NoAsset } from '../components';
import InitOperation, { DestinationResult } from './InitOperation/InitOperation';
import { useCountdown, useToggle } from '@renderer/shared/hooks';
import { MultisigAccount, isMultisig, Account } from '@renderer/domain/account';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { DEFAULT_TRANSITION } from '@renderer/shared/utils/constants';
import { DestinationType } from '../common/types';
import { BaseModal } from '@renderer/components/ui-redesign';
import Paths from '@renderer/routes/paths';
import { useAccount } from '@renderer/services/account/accountService';
import ScanMultiframeQr from '@renderer/components/common/Scanning/ScanMultiframeQr';
import ScanSingleframeQr from '@renderer/components/common/Scanning/ScanSingleframeQr';

const enum Step {
  INIT,
  CONFIRMATION,
  SCANNING,
  SIGNING,
  SUBMIT,
}

export const Destination = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { getActiveAccounts } = useAccount();
  const { connections } = useNetworkContext();
  const { getTransactionHash } = useTransaction();
  const [searchParams] = useSearchParams();
  const { getChainById } = useChains();
  const params = useParams<{ chainId: ChainId }>();

  const [isDestModalOpen, toggleDestModal] = useToggle(true);

  const [activeStep, setActiveStep] = useState<Step>(Step.INIT);
  const [chainName, setChainName] = useState('...');

  const [destination, setDestination] = useState<DestinationType>();
  const [description, setDescription] = useState('');

  const [multisigTx, setMultisigTx] = useState<Transaction>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [unsignedTransactions, setUnsignedTransactions] = useState<UnsignedTransaction[]>([]);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [signer, setSigner] = useState<Account>();
  const [signatures, setSignatures] = useState<HexString[]>([]);

  const accountIds = searchParams.get('id')?.split(',') || [];
  const chainId = params.chainId || ('' as ChainId);
  const activeAccounts = getActiveAccounts();

  useEffect(() => {
    if (!activeAccounts.length || !accountIds.length) return;

    const accounts = activeAccounts.filter((a) => a.id && accountIds.includes(a.id.toString()));
    setAccounts(accounts);
  }, [activeAccounts.length]);

  useEffect(() => {
    getChainById(chainId).then((chain) => setChainName(chain?.name || ''));
  }, []);

  const connection = connections[chainId];
  const [countdown, resetCountdown] = useCountdown(connection?.api);

  if (!connection || accountIds.length === 0) {
    return <Navigate replace to={Paths.STAKING} />;
  }

  const { api, explorers, addressPrefix, assets, name } = connections[chainId];
  const asset = getRelaychainAsset(assets);

  const goToPrevStep = () => {
    if (activeStep === Step.INIT) {
      navigate(Paths.STAKING);
    } else {
      setActiveStep((prev) => prev - 1);
    }
  };

  const closeDestinationModal = () => {
    toggleDestModal();
    setTimeout(() => navigate(Paths.STAKING), DEFAULT_TRANSITION);
  };

  if (!api?.isConnected) {
    return (
      <BaseModal
        closeButton
        contentClass=""
        panelClass="w-max"
        isOpen={isDestModalOpen}
        title={t('staking.destination.title')}
        onClose={closeDestinationModal}
      >
        <div className="w-[440px] px-5 py-20">
          <ChainLoader chainName={chainName} />
        </div>
      </BaseModal>
    );
  }

  if (!asset) {
    return (
      <BaseModal
        closeButton
        contentClass=""
        panelClass="w-max"
        isOpen={isDestModalOpen}
        title={t('staking.destination.title')}
        onClose={closeDestinationModal}
      >
        <div className="w-[440px] px-5 py-20">
          <NoAsset chainName={name} isOpen={isDestModalOpen} onClose={closeDestinationModal} />
        </div>
      </BaseModal>
    );
  }

  const onInitResult = ({ accounts, destination, signer, description }: DestinationResult) => {
    const destPayload = destination
      ? { type: RewardsDestination.TRANSFERABLE, address: destination }
      : { type: RewardsDestination.RESTAKE };

    const transactions = getDestinationTxs(accounts, destination);

    if (signer && isMultisig(accounts[0])) {
      const multisigTx = getMultisigTx(accounts[0], signer.accountId, transactions[0]);
      setMultisigTx(multisigTx);
      setSigner(signer);
      setDescription(description || '');
    }

    setTransactions(transactions);
    setAccounts(accounts);
    setDestination(destPayload);
    setActiveStep(Step.CONFIRMATION);
  };

  const getDestinationTxs = (accounts: Account[], destination?: Address): Transaction[] => {
    return accounts.map(({ accountId }) => ({
      chainId,
      address: toAddress(accountId, { prefix: addressPrefix }),
      type: TransactionType.DESTINATION,
      args: { payee: destination ? { Account: destination } : 'Staked' },
    }));
  };

  const getMultisigTx = (
    account: MultisigAccount,
    signerAccountId: AccountId,
    transaction: Transaction,
  ): Transaction => {
    const { callData, callHash } = getTransactionHash(transaction, api);

    const otherSignatories = account.signatories.reduce<Address[]>((acc, s) => {
      if (s.accountId !== signerAccountId) {
        acc.push(toAddress(s.accountId, { prefix: addressPrefix }));
      }

      return acc;
    }, []);

    return {
      chainId,
      address: toAddress(signerAccountId, { prefix: addressPrefix }),
      type: TransactionType.MULTISIG_AS_MULTI,
      args: {
        threshold: account.threshold,
        otherSignatories: otherSignatories.sort(),
        maybeTimepoint: null,
        callData,
        callHash,
      },
    };
  };

  const onScanResult = (unsigned: UnsignedTransaction[]) => {
    setUnsignedTransactions(unsigned);
    setActiveStep(Step.SIGNING);
  };

  const onSignResult = (signatures: HexString[]) => {
    setSignatures(signatures);
    setActiveStep(Step.SUBMIT);
  };

  const explorersProps = { explorers, addressPrefix, asset };

  return (
    <BaseModal
      closeButton
      contentClass=""
      panelClass="w-max"
      isOpen={isDestModalOpen}
      title={t('staking.destination.title')}
      onClose={closeDestinationModal}
    >
      {activeStep === Step.INIT && (
        <InitOperation api={api} chainId={chainId} accounts={accounts} onResult={onInitResult} {...explorersProps} />
      )}
      {activeStep === Step.CONFIRMATION && (
        <Confirmation
          api={api}
          accounts={accounts}
          signer={signer}
          destination={destination}
          description={description}
          transaction={transactions[0]}
          multisigTx={multisigTx}
          onResult={() => setActiveStep(Step.SCANNING)}
          onGoBack={goToPrevStep}
          {...explorersProps}
        />
      )}
      {activeStep === Step.SCANNING && (
        <div className="w-[440px] px-5 py-4">
          {transactions.length > 1 ? (
            <ScanMultiframeQr
              api={api}
              addressPrefix={addressPrefix}
              countdown={countdown}
              accounts={accounts}
              transactions={transactions}
              chainId={chainId}
              onGoBack={() => setActiveStep(Step.CONFIRMATION)}
              onResetCountdown={resetCountdown}
              onResult={onScanResult}
            />
          ) : (
            <ScanSingleframeQr
              api={api}
              addressPrefix={addressPrefix}
              countdown={countdown}
              account={signer}
              transaction={multisigTx || transactions[0]}
              chainId={chainId}
              onGoBack={() => setActiveStep(Step.CONFIRMATION)}
              onResetCountdown={resetCountdown}
              onResult={(unsignedTx) => onScanResult([unsignedTx])}
            />
          )}
        </div>
      )}
      {activeStep === Step.SIGNING && (
        <Signing
          countdown={countdown}
          multiQr={transactions.length > 1}
          onResult={onSignResult}
          onGoBack={() => setActiveStep(Step.SCANNING)}
        />
      )}
      {activeStep === Step.SUBMIT && (
        <Submit
          api={api}
          txs={transactions}
          multisigTx={multisigTx}
          signatures={signatures}
          unsignedTx={unsignedTransactions}
          accounts={accounts}
          description={description}
          onClose={closeDestinationModal}
        />
      )}
    </BaseModal>
  );
};

import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import Paths from '@renderer/routes/paths';
import { ChainLoader } from '@renderer/components/common';
import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { ChainId, HexString, AccountId, Address } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { useAccount } from '@renderer/services/account/accountService';
import { useChains } from '@renderer/services/network/chainsService';
import InitOperation, { RedeemResult } from './InitOperation/InitOperation';
import { Confirmation, Signing, Submit, NoAsset } from '../components';
import { getRelaychainAsset } from '@renderer/shared/utils/assets';
import { useCountdown, useToggle } from '@renderer/shared/hooks';
import { Account, MultisigAccount, isMultisig } from '@renderer/domain/account';
import { toAddress } from '@renderer/shared/utils/address';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { DEFAULT_TRANSITION } from '@renderer/shared/utils/constants';
import OperationModalTitle from '@renderer/screens/Operations/components/OperationModalTitle';
import { BaseModal } from '@renderer/components/ui-redesign';
import ScanMultiframeQr from '@renderer/components/common/Scanning/ScanMultiframeQr';
import ScanSingleframeQr from '@renderer/components/common/Scanning/ScanSingleframeQr';

const enum Step {
  INIT,
  CONFIRMATION,
  SCANNING,
  SIGNING,
  SUBMIT,
}

const Redeem = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { getTransactionHash } = useTransaction();
  const { connections } = useNetworkContext();
  const { getLiveAccounts } = useAccount();
  const { getChainById } = useChains();
  const [searchParams] = useSearchParams();
  const params = useParams<{ chainId: ChainId }>();

  const dbAccounts = getLiveAccounts();

  const [isRedeemModalOpen, toggleRedeemModal] = useToggle(true);

  const [activeStep, setActiveStep] = useState<Step>(Step.INIT);
  const [chainName, setChainName] = useState('...');
  const [redeemAmounts, setRedeemAmounts] = useState<string[]>([]);
  const [description, setDescription] = useState('');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [signer, setSigner] = useState<Account>();

  const [multisigTx, setMultisigTx] = useState<Transaction>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [unsignedTransactions, setUnsignedTransactions] = useState<UnsignedTransaction[]>([]);

  const [signatures, setSignatures] = useState<HexString[]>([]);

  const chainId = params.chainId || ('' as ChainId);
  const accountIds = searchParams.get('id')?.split(',') || [];

  if (!chainId || accountIds.length === 0) {
    return <Navigate replace to={Paths.STAKING} />;
  }

  const { api, explorers, addressPrefix, assets, name } = connections[chainId];
  const asset = getRelaychainAsset(assets);

  const [countdown, resetCountdown] = useCountdown(api);

  useEffect(() => {
    const selectedAccounts = dbAccounts.reduce<Account[]>((acc, account) => {
      const accountExists = account.id && accountIds.includes(account.id.toString());
      if (accountExists) {
        acc.push(account);
      }

      return acc;
    }, []);

    setAccounts(selectedAccounts);
  }, [dbAccounts.length]);

  useEffect(() => {
    getChainById(chainId).then((chain) => setChainName(chain?.name || ''));
  }, []);

  if (!api?.isConnected) {
    return <ChainLoader chainName={chainName} />;
  }

  const goToPrevStep = () => {
    if (activeStep === Step.INIT) {
      navigate(Paths.STAKING);
    } else {
      // TODO: reset data
      setActiveStep((prev) => prev - 1);
    }
  };

  const closeRedeemModal = () => {
    toggleRedeemModal();
    setTimeout(() => navigate(Paths.STAKING), DEFAULT_TRANSITION);
  };

  if (!asset) {
    return (
      <NoAsset
        title={t('staking.redeem.title')}
        chainName={name}
        isOpen={isRedeemModalOpen}
        onClose={closeRedeemModal}
      />
    );
  }

  const getRedeemTxs = (accounts: Account[]): Transaction[] => {
    return accounts.map(({ accountId }) => ({
      chainId,
      address: toAddress(accountId, { prefix: addressPrefix }),
      type: TransactionType.REDEEM,
      args: { numSlashingSpans: 1 },
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

  const onInitResult = ({ accounts, signer, amounts, description }: RedeemResult) => {
    const transactions = getRedeemTxs(accounts);

    if (signer && isMultisig(accounts[0])) {
      const multisigTx = getMultisigTx(accounts[0], signer.accountId, transactions[0]);
      setMultisigTx(multisigTx);
      setSigner(signer);
      setDescription(description || '');
    }

    setTransactions(transactions);
    setAccounts(accounts);
    setRedeemAmounts(amounts);
    setActiveStep(Step.CONFIRMATION);
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
      isOpen={isRedeemModalOpen}
      title={<OperationModalTitle title={`${t('staking.redeem.title', { asset: asset.symbol })}`} chainId={chainId} />}
      onClose={closeRedeemModal}
    >
      {activeStep === Step.INIT && (
        <InitOperation api={api} chainId={chainId} accounts={accounts} onResult={onInitResult} {...explorersProps} />
      )}
      {activeStep === Step.CONFIRMATION && (
        <Confirmation
          api={api}
          accounts={accounts}
          signer={signer}
          amounts={redeemAmounts}
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
              account={signer || accounts[0]}
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
          description={description}
          signatures={signatures}
          unsignedTx={unsignedTransactions}
          accounts={accounts}
          successMessage={t('staking.redeem.submitSuccess')}
          onClose={closeRedeemModal}
          {...explorersProps}
        />
      )}
    </BaseModal>
  );
};

export default Redeem;

import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { ChainId, HexString, Address, AccountId } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import InitOperation, { StakeMoreResult } from './InitOperation/InitOperation';
import { Confirmation, Signing, Submit, NoAsset } from '../components';
import { getRelaychainAsset } from '@renderer/shared/utils/assets';
import { useCountdown, useToggle } from '@renderer/shared/hooks';
import { isMultisig, MultisigAccount, Account } from '@renderer/domain/account';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { toAddress } from '@renderer/shared/utils/address';
import { Alert, BaseModal, Button } from '@renderer/components/ui-redesign';
import { DEFAULT_TRANSITION } from '@renderer/shared/utils/constants';
import Paths from '@renderer/routes/paths';
import OperationModalTitle from '@renderer/screens/Operations/components/OperationModalTitle';
import { useAccount } from '@renderer/services/account/accountService';
import ScanMultiframeQr from '@renderer/components/common/Scanning/ScanMultiframeQr';
import ScanSingleframeQr from '@renderer/components/common/Scanning/ScanSingleframeQr';
import { Loader } from '@renderer/components/ui';

const enum Step {
  INIT,
  CONFIRMATION,
  SCANNING,
  SIGNING,
  SUBMIT,
}

export const StakeMore = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { getActiveAccounts } = useAccount();
  const { getTransactionHash } = useTransaction();
  const { connections } = useNetworkContext();
  const [searchParams] = useSearchParams();
  const params = useParams<{ chainId: ChainId }>();

  const [isStakeMoreModalOpen, toggleStakeMoreModal] = useToggle(true);
  const [isAlertOpen, toggleAlert] = useToggle(true);

  const [activeStep, setActiveStep] = useState<Step>(Step.INIT);

  const [stakeMoreAmount, setStakeMoreAmount] = useState('');
  const [description, setDescription] = useState('');

  const [multisigTx, setMultisigTx] = useState<Transaction>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [unsignedTransactions, setUnsignedTransactions] = useState<UnsignedTransaction[]>([]);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [txAccounts, setTxAccounts] = useState<Account[]>([]);
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

  const closeStakeMoreModal = () => {
    toggleStakeMoreModal();
    setTimeout(() => navigate(Paths.STAKING), DEFAULT_TRANSITION);
  };

  if (!api?.isConnected) {
    return (
      <BaseModal
        closeButton
        contentClass=""
        headerClass="py-3 px-5 max-w-[440px]"
        panelClass="w-max"
        isOpen={isStakeMoreModalOpen}
        title={<OperationModalTitle title={`${t('staking.stakeMore.title', { asset: '' })}`} chainId={chainId} />}
        onClose={closeStakeMoreModal}
      >
        <div className="w-[440px] px-5 py-4">
          <Loader className="my-24 mx-auto" color="primary" size={25} />
          <Button disabled className="w-fit flex-0 mt-7 ml-auto">
            {t('staking.bond.continueButton')}
          </Button>
        </div>
      </BaseModal>
    );
  }

  if (!asset) {
    return (
      <BaseModal
        closeButton
        contentClass=""
        headerClass="py-3 px-5 max-w-[440px]"
        panelClass="w-max"
        isOpen={isStakeMoreModalOpen}
        title={<OperationModalTitle title={`${t('staking.stakeMore.title', { asset: '' })}`} chainId={chainId} />}
        onClose={closeStakeMoreModal}
      >
        <div className="w-[440px] px-5 py-20">
          <NoAsset chainName={name} isOpen={isStakeMoreModalOpen} onClose={closeStakeMoreModal} />
        </div>
      </BaseModal>
    );
  }

  const getStakeMoreTxs = (accounts: Account[], amount: string): Transaction[] => {
    return accounts.map(({ accountId }) => ({
      chainId,
      address: toAddress(accountId, { prefix: addressPrefix }),
      type: TransactionType.STAKE_MORE,
      args: { maxAdditional: amount },
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

  const onInitResult = ({ accounts, amount, signer, description }: StakeMoreResult) => {
    const transactions = getStakeMoreTxs(accounts, amount);

    if (signer && isMultisig(accounts[0])) {
      const multisigTx = getMultisigTx(accounts[0], signer.accountId, transactions[0]);
      setMultisigTx(multisigTx);
      setSigner(signer);
      setDescription(description || '');
    }

    setTransactions(transactions);
    setTxAccounts(accounts);
    setStakeMoreAmount(amount);
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
  const stakeMoreValues = new Array(txAccounts.length).fill(stakeMoreAmount);

  return (
    <>
      <BaseModal
        closeButton
        contentClass=""
        headerClass="py-3 px-5 max-w-[440px]"
        panelClass="w-max"
        isOpen={activeStep !== Step.SUBMIT && isStakeMoreModalOpen}
        title={
          <OperationModalTitle title={`${t('staking.stakeMore.title', { asset: asset.symbol })}`} chainId={chainId} />
        }
        onClose={closeStakeMoreModal}
      >
        {activeStep === Step.INIT && (
          <InitOperation api={api} chainId={chainId} accounts={accounts} onResult={onInitResult} {...explorersProps} />
        )}
        {activeStep === Step.CONFIRMATION && (
          <Confirmation
            api={api}
            accounts={txAccounts}
            signer={signer}
            transaction={transactions[0]}
            description={description}
            amounts={stakeMoreValues}
            multisigTx={multisigTx}
            onResult={() => setActiveStep(Step.SCANNING)}
            onGoBack={goToPrevStep}
            {...explorersProps}
          >
            {isAlertOpen && (
              <Alert title={t('staking.confirmation.hintTitle')} onClose={toggleAlert}>
                <Alert.Item>{t('staking.confirmation.hintNewRewards')}</Alert.Item>
              </Alert>
            )}
          </Confirmation>
        )}
        {activeStep === Step.SCANNING && (
          <div className="w-[440px] px-5 py-4">
            {transactions.length > 1 ? (
              <ScanMultiframeQr
                api={api}
                addressPrefix={addressPrefix}
                countdown={countdown}
                accounts={txAccounts}
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
                account={signer || txAccounts[0]}
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
            api={api}
            transaction={multisigTx || transactions[0]}
            countdown={countdown}
            accountId={(signer || txAccounts[0]).accountId}
            multiQr={transactions.length > 1}
            onResult={onSignResult}
            onGoBack={() => setActiveStep(Step.SCANNING)}
          />
        )}
      </BaseModal>

      {activeStep === Step.SUBMIT && (
        <Submit
          api={api}
          txs={transactions}
          multisigTx={multisigTx}
          signatures={signatures}
          unsignedTx={unsignedTransactions}
          accounts={txAccounts}
          description={description}
          onClose={toggleStakeMoreModal}
          {...explorersProps}
        />
      )}
    </>
  );
};

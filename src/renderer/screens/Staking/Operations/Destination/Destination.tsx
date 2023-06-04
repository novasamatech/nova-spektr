import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { toAddress } from '@renderer/shared/utils/address';
import { getRelaychainAsset } from '@renderer/shared/utils/assets';
import { RewardsDestination } from '@renderer/domain/stake';
import { ChainLoader } from '@renderer/components/common';
import { ButtonBack, ButtonLink, Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { useChains } from '@renderer/services/network/chainsService';
import { Address, ChainId, HexString, AccountId } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { Confirmation, MultiScanning, Signing, Submit, SingleScanning } from '../components';
import Paths from '@renderer/routes/paths';
import { AccountDS } from '@renderer/services/storage';
import InitOperation, { DestinationResult } from './InitOperation/InitOperation';
import { useCountdown, useToggle } from '@renderer/shared/hooks';
import { MultisigAccount, isMultisig, Account } from '@renderer/domain/account';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { DEFAULT_TRANSITION } from '@renderer/shared/utils/constants';

const enum Step {
  INIT,
  CONFIRMATION,
  SCANNING,
  SIGNING,
  SUBMIT,
}

type DestinationType = {
  address?: Address;
  type: RewardsDestination;
};

const HeaderTitles: Record<Step, string> = {
  [Step.INIT]: 'staking.destination.initDestinationSubtitle',
  [Step.CONFIRMATION]: 'staking.bond.confirmBondSubtitle',
  [Step.SCANNING]: 'staking.bond.scanSubtitle',
  [Step.SIGNING]: 'staking.bond.signSubtitle',
  [Step.SUBMIT]: 'staking.bond.submitSubtitle',
};

const Destination = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { connections } = useNetworkContext();
  const { getTransactionHash } = useTransaction();
  const [searchParams] = useSearchParams();
  const { getChainById } = useChains();
  const params = useParams<{ chainId: ChainId }>();

  const [_, toggleDestinationModal] = useToggle(true);

  const [activeStep, setActiveStep] = useState<Step>(Step.INIT);
  const [chainName, setChainName] = useState('...');

  const [accounts, setAccounts] = useState<AccountDS[]>([]);
  const [signer, setSigner] = useState<Account>();
  const [destination, setDestination] = useState<DestinationType>();
  const [description, setDescription] = useState('');

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [multisigTx, setMultisigTx] = useState<Transaction>();
  const [unsignedTransactions, setUnsignedTransactions] = useState<UnsignedTransaction[]>([]);

  const [signatures, setSignatures] = useState<HexString[]>([]);

  const chainId = params.chainId || ('' as ChainId);
  const accountIds = searchParams.get('id')?.split(',') || [];

  if (!chainId || accountIds.length === 0) {
    return <Navigate replace to={Paths.STAKING} />;
  }

  const { api, explorers, addressPrefix, assets, name } = connections[chainId];
  const asset = getRelaychainAsset(assets);

  useEffect(() => {
    getChainById(chainId).then((chain) => setChainName(chain?.name || ''));
  }, []);

  if (!api?.isConnected) {
    return <ChainLoader chainName={chainName} />;
  }

  const [countdown, resetCountdown] = useCountdown(api);

  const goToPrevStep = () => {
    if (activeStep === Step.INIT) {
      navigate(Paths.STAKING);
    } else {
      // TODO: reset data
      setActiveStep((prev) => prev - 1);
    }
  };

  const closeDestinationModal = () => {
    toggleDestinationModal();
    setTimeout(() => navigate(Paths.STAKING), DEFAULT_TRANSITION);
  };

  const headerContent = (
    <div className="flex items-center gap-x-2.5 mb-9 mt-5 px-5">
      <ButtonBack onCustomReturn={goToPrevStep} />
      <p className="font-semibold text-2xl text-neutral-variant">{t('staking.title')}</p>
      <p className="font-semibold text-2xl text-neutral">/</p>
      <h1 className="font-semibold text-2xl text-neutral">{t(HeaderTitles[activeStep])}</h1>
    </div>
  );

  if (!asset) {
    return (
      <div className="flex flex-col h-full relative">
        {headerContent}

        <div className="flex w-full h-full flex-col items-center justify-center">
          <Icon name="noResults" size={380} />
          <p className="text-neutral text-3xl font-bold">{t('staking.bond.noStakingAssetLabel')}</p>
          <p className="text-neutral-variant text-base font-normal">
            {t('staking.bond.noStakingAssetDescription', { chainName: name })}
          </p>
          <ButtonLink className="mt-5" to={Paths.STAKING} variant="fill" pallet="primary" weight="lg">
            {t('staking.bond.goToStakingButton')}
          </ButtonLink>
        </div>
      </div>
    );
  }

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

  const onDestinationResult = ({ accounts, destination, signer, description }: DestinationResult) => {
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

  const onScanResult = (unsigned: UnsignedTransaction[]) => {
    setUnsignedTransactions(unsigned);
    setActiveStep(Step.SIGNING);
  };

  const onBackToScan = () => {
    setActiveStep(Step.SCANNING);
  };

  const onSignResult = (signatures: HexString[]) => {
    setSignatures(signatures);
    setActiveStep(Step.SUBMIT);
  };

  return (
    <div className="flex flex-col h-full relative">
      {headerContent}

      {activeStep === Step.INIT && (
        <InitOperation
          api={api}
          chainId={chainId}
          addressPrefix={addressPrefix}
          identifiers={accountIds}
          asset={asset}
          onResult={onDestinationResult}
        />
      )}
      {activeStep === Step.CONFIRMATION && (
        <Confirmation
          api={api}
          accounts={accounts}
          destination={destination}
          transaction={transactions[0]}
          multisigTx={multisigTx}
          asset={asset}
          explorers={explorers}
          addressPrefix={addressPrefix}
          onResult={() => setActiveStep(Step.SCANNING)}
          onGoBack={goToPrevStep}
        />
      )}
      {activeStep === Step.SCANNING &&
        (transactions.length > 1 ? (
          <MultiScanning
            api={api}
            addressPrefix={addressPrefix}
            countdown={countdown}
            accounts={accounts}
            transactions={transactions}
            chainId={chainId}
            onResetCountdown={resetCountdown}
            onResult={onScanResult}
          />
        ) : (
          <SingleScanning
            api={api}
            addressPrefix={addressPrefix}
            countdown={countdown}
            account={signer || accounts[0]}
            transaction={multisigTx || transactions[0]}
            chainId={chainId}
            onResetCountdown={resetCountdown}
            onResult={(unsignedTx) => onScanResult([unsignedTx])}
          />
        ))}
      {activeStep === Step.SIGNING && (
        <Signing
          countdown={countdown}
          multiQr={transactions.length > 1}
          onResult={onSignResult}
          onGoBack={onBackToScan}
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
          successMessage={t('staking.destination.submitSuccess')}
          description={description}
          onClose={closeDestinationModal}
        />
      )}
    </div>
  );
};

export default Destination;

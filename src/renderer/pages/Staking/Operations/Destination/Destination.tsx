import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { toAddress, getRelaychainAsset, DEFAULT_TRANSITION } from '@renderer/shared/lib/utils';
import { RewardsDestination } from '@renderer/entities/staking';
import { useI18n, useNetworkContext, Paths } from '@renderer/app/providers';
import { Address, ChainId, HexString } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType, useTransaction } from '@renderer/entities/transaction';
import { Confirmation, Submit, NoAsset } from '../components';
import InitOperation, { DestinationResult } from './InitOperation/InitOperation';
import { useToggle } from '@renderer/shared/lib/hooks';
import { isMultisig, Account, useAccount } from '@renderer/entities/account';
import { DestinationType } from '../common/types';
import { BaseModal, Button, Loader } from '@renderer/shared/ui';
import { OperationTitle } from '@renderer/components/common';
import { Signing } from '@renderer/features/operation';

const enum Step {
  INIT,
  CONFIRMATION,
  SIGNING,
  SUBMIT,
}

export const Destination = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { getActiveAccounts } = useAccount();
  const { connections } = useNetworkContext();
  const { setTxs, txs, setWrappers, wrapTx, buildTransaction } = useTransaction();
  const [searchParams] = useSearchParams();
  const params = useParams<{ chainId: ChainId }>();

  const [isDestModalOpen, toggleDestModal] = useToggle(true);

  const [activeStep, setActiveStep] = useState<Step>(Step.INIT);

  const [destination, setDestination] = useState<DestinationType>();
  const [description, setDescription] = useState('');

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
        headerClass="py-3 px-5 max-w-[440px]"
        panelClass="w-max"
        isOpen={isDestModalOpen}
        title={<OperationTitle title={`${t('staking.destination.title', { asset: '' })}`} chainId={chainId} />}
        onClose={closeDestinationModal}
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
        panelClass="w-max"
        headerClass="py-3 px-5 max-w-[440px]"
        isOpen={isDestModalOpen}
        title={<OperationTitle title={`${t('staking.destination.title', { asset: '' })}`} chainId={chainId} />}
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
      const wrapAsMulti = {
        signatoryId: signer.accountId,
        account: accounts[0],
      };
      setWrappers([wrapAsMulti]);
      setSigner(signer);
      setDescription(description || '');
    }

    setTxs(transactions);
    setTxAccounts(accounts);
    setDestination(destPayload);
    setActiveStep(Step.CONFIRMATION);
  };

  const getDestinationTxs = (accounts: Account[], destination?: Address): Transaction[] => {
    return accounts.map(({ accountId }) =>
      buildTransaction(TransactionType.DESTINATION, toAddress(accountId, { prefix: addressPrefix }), chainId, {
        payee: destination ? { Account: destination } : 'Staked',
      }),
    );
  };

  const onSignResult = (signatures: HexString[], unsigned: UnsignedTransaction[]) => {
    setUnsignedTransactions(unsigned);
    setSignatures(signatures);
    setActiveStep(Step.SUBMIT);
  };

  const explorersProps = { explorers, addressPrefix, asset };
  const multisigTx = isMultisig(txAccounts[0]) ? wrapTx(txs[0], api, addressPrefix) : undefined;

  return (
    <>
      <BaseModal
        closeButton
        contentClass=""
        headerClass="py-3 px-5 max-w-[440px]"
        panelClass="w-max"
        isOpen={activeStep !== Step.SUBMIT && isDestModalOpen}
        title={<OperationTitle title={`${t('staking.destination.title', { asset: '' })}`} chainId={chainId} />}
        onClose={closeDestinationModal}
      >
        {activeStep === Step.INIT && (
          <InitOperation api={api} chainId={chainId} accounts={accounts} onResult={onInitResult} {...explorersProps} />
        )}
        {activeStep === Step.CONFIRMATION && (
          <Confirmation
            api={api}
            accounts={txAccounts}
            signer={signer}
            destination={destination}
            description={description}
            transaction={txs[0]}
            onResult={() => setActiveStep(Step.SIGNING)}
            onGoBack={goToPrevStep}
            {...explorersProps}
          />
        )}
        {activeStep === Step.SIGNING && (
          <Signing
            chainId={chainId}
            api={api}
            addressPrefix={addressPrefix}
            signatory={signer}
            accounts={txAccounts}
            transactions={multisigTx ? [multisigTx] : txs}
            onGoBack={() => setActiveStep(Step.CONFIRMATION)}
            onResult={onSignResult}
          />
        )}
      </BaseModal>

      {activeStep === Step.SUBMIT && (
        <Submit
          api={api}
          txs={txs}
          multisigTx={multisigTx}
          signatures={signatures}
          unsignedTx={unsignedTransactions}
          accounts={txAccounts}
          description={description}
          onClose={toggleDestModal}
        />
      )}
    </>
  );
};

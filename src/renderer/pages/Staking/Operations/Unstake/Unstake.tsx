import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { UnstakingDuration } from '@renderer/pages/Staking/Overview/components';
import { Paths, useI18n, useNetworkContext } from '@renderer/app/providers';
import { ChainId, HexString } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType, useTransaction } from '@renderer/entities/transaction';
import { Account, isMultisig, useAccount } from '@renderer/entities/account';
import InitOperation, { UnstakeResult } from './InitOperation/InitOperation';
import { Confirmation, NoAsset, Submit } from '../components';
import { DEFAULT_TRANSITION, getRelaychainAsset, toAddress } from '@renderer/shared/lib/utils';
import { useToggle } from '@renderer/shared/lib/hooks';
import { Alert, BaseModal, Button, Loader } from '@renderer/shared/ui';
import { OperationTitle } from '@renderer/components/common';
import { Signing } from '@renderer/features/operation';

const enum Step {
  INIT,
  CONFIRMATION,
  SIGNING,
  SUBMIT,
}

export const Unstake = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { setTxs, txs, setWrapAs, wrapTx, buildTransaction } = useTransaction();
  const { connections } = useNetworkContext();
  const { getActiveAccounts } = useAccount();
  const [searchParams] = useSearchParams();
  const params = useParams<{ chainId: ChainId }>();

  const [isUnstakeModalOpen, toggleUnstakeModal] = useToggle(true);
  const [isAlertOpen, toggleAlert] = useToggle(true);

  const [activeStep, setActiveStep] = useState<Step>(Step.INIT);

  const [unstakeAmount, setUnstakeAmount] = useState('');
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

  const closeUnstakeModal = () => {
    toggleUnstakeModal();
    setTimeout(() => navigate(Paths.STAKING), DEFAULT_TRANSITION);
  };

  if (!api?.isConnected) {
    return (
      <BaseModal
        closeButton
        contentClass=""
        headerClass="py-3 px-5 max-w-[440px]"
        panelClass="w-max"
        isOpen={isUnstakeModalOpen}
        title={<OperationTitle title={`${t('staking.unstake.title', { asset: '' })}`} chainId={chainId} />}
        onClose={closeUnstakeModal}
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
        isOpen={isUnstakeModalOpen}
        title={<OperationTitle title={`${t('staking.unstake.title', { asset: '' })}`} chainId={chainId} />}
        onClose={closeUnstakeModal}
      >
        <div className="w-[440px] px-5 py-20">
          <NoAsset chainName={name} isOpen={isUnstakeModalOpen} onClose={closeUnstakeModal} />
        </div>
      </BaseModal>
    );
  }

  const onInitResult = ({ accounts, amount, signer, description, withChill }: UnstakeResult) => {
    const transactions = getUnstakeTxs(accounts, amount, withChill);

    if (signer && isMultisig(accounts[0])) {
      const wrapAsMulti = {
        signatoryId: signer.accountId,
        account: txAccounts[0],
      };
      setWrapAs([wrapAsMulti]);
      setSigner(signer);
      setDescription(description || '');
    }

    setTxs(transactions);
    setTxAccounts(accounts);
    setUnstakeAmount(amount);
    setActiveStep(Step.CONFIRMATION);
  };

  const getUnstakeTxs = (accounts: Account[], amount: string, withChill: boolean[]): Transaction[] => {
    return accounts.map(({ accountId }, index) => {
      const address = toAddress(accountId, { prefix: addressPrefix });

      const unstakeTx = buildTransaction(TransactionType.UNSTAKE, address, chainId, { value: amount });

      if (!withChill[index]) return unstakeTx;

      const chillTx = buildTransaction(TransactionType.CHILL, address, chainId, {});

      return buildTransaction(TransactionType.BATCH_ALL, address, chainId, { transactions: [chillTx, unstakeTx] });
    });
  };

  const onSignResult = (signatures: HexString[], unsigned: UnsignedTransaction[]) => {
    setUnsignedTransactions(unsigned);
    setSignatures(signatures);
    setActiveStep(Step.SUBMIT);
  };

  const explorersProps = { explorers, addressPrefix, asset };
  const unstakeValues = new Array(txAccounts.length).fill(unstakeAmount);
  const multisigTx = isMultisig(txAccounts[0]) ? wrapTx(txs[0], api, addressPrefix) : undefined;

  return (
    <>
      <BaseModal
        closeButton
        contentClass=""
        panelClass="w-max"
        headerClass="py-3 px-5 max-w-[440px]"
        isOpen={activeStep !== Step.SUBMIT && isUnstakeModalOpen}
        title={<OperationTitle title={`${t('staking.unstake.title', { asset: asset.symbol })}`} chainId={chainId} />}
        onClose={closeUnstakeModal}
      >
        {activeStep === Step.INIT && (
          <InitOperation api={api} chainId={chainId} accounts={accounts} onResult={onInitResult} {...explorersProps} />
        )}
        {activeStep === Step.CONFIRMATION && (
          <Confirmation
            api={api}
            accounts={txAccounts}
            signer={signer}
            description={description}
            transaction={txs[0]}
            amounts={unstakeValues}
            onResult={() => setActiveStep(Step.SIGNING)}
            onGoBack={goToPrevStep}
            {...explorersProps}
          >
            {isAlertOpen && (
              <Alert title={t('staking.confirmation.hintTitle')} onClose={toggleAlert}>
                <Alert.Item>
                  {t('staking.confirmation.hintUnstakePeriod')} {'('}
                  <UnstakingDuration api={api} />
                  {')'}
                </Alert.Item>
                <Alert.Item>{t('staking.confirmation.hintNoRewards')}</Alert.Item>
                <Alert.Item>{t('staking.confirmation.hintWithdraw')}</Alert.Item>
              </Alert>
            )}
          </Confirmation>
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
          onClose={toggleUnstakeModal}
          {...explorersProps}
        />
      )}
    </>
  );
};

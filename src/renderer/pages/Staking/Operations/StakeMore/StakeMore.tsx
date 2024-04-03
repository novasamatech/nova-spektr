import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { Paths } from '@shared/routes';
import { Transaction, TransactionType, useTransaction } from '@entities/transaction';
import InitOperation, { StakeMoreResult } from './InitOperation/InitOperation';
import { Confirmation, NoAsset, Submit } from '../components';
import { DEFAULT_TRANSITION, getRelaychainAsset, toAddress } from '@shared/lib/utils';
import { useToggle } from '@shared/lib/hooks';
import { Account, ChainId, HexString, MultisigAccount } from '@shared/core';
import { BaseModal, Button, Loader } from '@shared/ui';
import { OperationTitle } from '@entities/chain';
import { SigningSwitch } from '@features/operations';
import { walletModel, walletUtils } from '@entities/wallet';
import { priceProviderModel } from '@entities/price';
import { StakingPopover } from '../components/StakingPopover/StakingPopover';
import { useNetworkData } from '@entities/network';

const enum Step {
  INIT,
  CONFIRMATION,
  SIGNING,
  SUBMIT,
}

export const StakeMore = () => {
  const { t } = useI18n();
  const activeWallet = useUnit(walletModel.$activeWallet);
  const activeAccounts = useUnit(walletModel.$activeAccounts);

  const navigate = useNavigate();
  const { setTxs, txs, setWrappers, wrapTx, buildTransaction } = useTransaction();
  const [searchParams] = useSearchParams();
  const params = useParams<{ chainId: ChainId }>();

  const { api, chain } = useNetworkData(params.chainId);

  const [isStakeMoreModalOpen, toggleStakeMoreModal] = useToggle(true);

  const [activeStep, setActiveStep] = useState<Step>(Step.INIT);

  const [stakeMoreAmount, setStakeMoreAmount] = useState('');
  const [description, setDescription] = useState('');

  const [unsignedTransactions, setUnsignedTransactions] = useState<UnsignedTransaction[]>([]);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [txAccounts, setTxAccounts] = useState<Account[]>([]);
  const [signer, setSigner] = useState<Account>();
  const [signatures, setSignatures] = useState<HexString[]>([]);

  const isMultisigWallet = walletUtils.isMultisig(activeWallet);

  const accountIds = searchParams.get('id')?.split(',') || [];
  const chainId = params.chainId || ('' as ChainId);

  useEffect(() => {
    priceProviderModel.events.assetsPricesRequested({ includeRates: true });
  }, []);

  useEffect(() => {
    if (!activeAccounts.length || !accountIds.length) return;

    const accounts = activeAccounts.filter((a) => a.id && accountIds.includes(a.id.toString()));
    setAccounts(accounts);
  }, [activeAccounts.length]);

  if (!api || accountIds.length === 0) {
    return <Navigate replace to={Paths.STAKING} />;
  }

  const { explorers, addressPrefix, assets, name } = chain;
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
        headerClass="py-3 pl-5 pr-3"
        panelClass="w-max"
        isOpen={isStakeMoreModalOpen}
        title={<OperationTitle title={t('staking.stakeMore.title')} chainId={chainId} />}
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
        panelClass="w-max"
        headerClass="py-3 pl-5 pr-3"
        isOpen={isStakeMoreModalOpen}
        title={<OperationTitle title={t('staking.stakeMore.title')} chainId={chainId} />}
        onClose={closeStakeMoreModal}
      >
        <div className="w-[440px] px-5 py-20">
          <NoAsset chainName={name} isOpen={isStakeMoreModalOpen} onClose={closeStakeMoreModal} />
        </div>
      </BaseModal>
    );
  }

  const getStakeMoreTxs = (accounts: Account[], amount: string): Transaction[] => {
    return accounts.map(({ accountId }) =>
      buildTransaction(TransactionType.STAKE_MORE, toAddress(accountId, { prefix: addressPrefix }), chainId, {
        maxAdditional: amount,
      }),
    );
  };

  const onInitResult = ({ accounts, amount, signer, description }: StakeMoreResult) => {
    const transactions = getStakeMoreTxs(accounts, amount);

    if (signer && isMultisigWallet) {
      setWrappers([
        {
          signatoryId: signer.accountId,
          account: accounts[0] as MultisigAccount,
        },
      ]);
      setSigner(signer);
      setDescription(description || '');
    }

    setTxs(transactions);
    setTxAccounts(accounts);
    setStakeMoreAmount(amount);
    setActiveStep(Step.CONFIRMATION);
  };

  const onSignResult = (signatures: HexString[], unsigned: UnsignedTransaction[]) => {
    setUnsignedTransactions(unsigned);
    setSignatures(signatures);
    setActiveStep(Step.SUBMIT);
  };

  const explorersProps = { explorers, addressPrefix, asset };
  const stakeMoreValues = new Array(txAccounts.length).fill(stakeMoreAmount);
  const multisigTx = isMultisigWallet ? wrapTx(txs[0], api, addressPrefix) : undefined;

  return (
    <>
      <BaseModal
        closeButton
        contentClass=""
        headerClass="py-3 pl-5 pr-3"
        panelClass="w-max"
        isOpen={activeStep !== Step.SUBMIT && isStakeMoreModalOpen}
        title={<OperationTitle title={t('staking.stakeMore.title', { asset: asset.symbol })} chainId={chainId} />}
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
            transaction={txs[0]}
            description={description}
            amounts={stakeMoreValues}
            onResult={() => setActiveStep(Step.SIGNING)}
            onGoBack={goToPrevStep}
            {...explorersProps}
          >
            <StakingPopover labelText={t('staking.confirmation.hintTitle')}>
              <StakingPopover.Item>{t('staking.confirmation.hintNewRewards')}</StakingPopover.Item>
            </StakingPopover>
          </Confirmation>
        )}
        {activeStep === Step.SIGNING && (
          <SigningSwitch
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
          onClose={toggleStakeMoreModal}
          {...explorersProps}
        />
      )}
    </>
  );
};

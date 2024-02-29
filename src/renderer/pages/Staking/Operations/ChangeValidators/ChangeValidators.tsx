import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { Paths } from '@shared/routes';
import { Transaction, TransactionType, useTransaction } from '@entities/transaction';
import { ValidatorMap } from '@entities/staking';
import { toAddress, getRelaychainAsset, DEFAULT_TRANSITION } from '@shared/lib/utils';
import { Confirmation, Submit, Validators, NoAsset } from '../components';
import { useToggle } from '@shared/lib/hooks';
import { BaseModal, Button, Loader } from '@shared/ui';
import InitOperation, { ValidatorsResult } from './InitOperation/InitOperation';
import { useNetworkData, networkUtils } from '@entities/network';
import { OperationTitle } from '@entities/chain';
import { Signing } from '@features/operation';
import type { Account, ChainId, HexString, Address } from '@shared/core';
import { walletModel, walletUtils } from '@entities/wallet';
import { priceProviderModel } from '@entities/price';
import { StakingPopover } from '../components/StakingPopover/StakingPopover';

const enum Step {
  INIT,
  VALIDATORS,
  CONFIRMATION,
  SIGNING,
  SUBMIT,
}

export const ChangeValidators = () => {
  const { t } = useI18n();
  const activeWallet = useUnit(walletModel.$activeWallet);
  const activeAccounts = useUnit(walletModel.$activeAccounts);

  const navigate = useNavigate();
  const { setTxs, txs, setWrappers, wrapTx, buildTransaction } = useTransaction();
  const [searchParams] = useSearchParams();
  const params = useParams<{ chainId: ChainId }>();

  const { api, chain, connection } = useNetworkData(params.chainId || ('' as ChainId));

  const [isValidatorsModalOpen, toggleValidatorsModal] = useToggle(true);

  const [activeStep, setActiveStep] = useState<Step>(Step.INIT);
  const [validators, setValidators] = useState<ValidatorMap>({});

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

  const closeValidatorsModal = () => {
    toggleValidatorsModal();
    setTimeout(() => navigate(Paths.STAKING), DEFAULT_TRANSITION);
  };

  if (!api?.isConnected) {
    return (
      <BaseModal
        closeButton
        contentClass=""
        headerClass="py-3 pl-5 pr-3"
        panelClass="w-max"
        isOpen={isValidatorsModalOpen}
        title={<OperationTitle title={t('staking.validators.title')} chainId={chainId} />}
        onClose={closeValidatorsModal}
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
        headerClass="py-3 pl-5 pr-3"
        panelClass="w-max"
        isOpen={isValidatorsModalOpen}
        title={<OperationTitle title={t('staking.validators.title')} chainId={chainId} />}
        onClose={closeValidatorsModal}
      >
        <div className="w-[440px] px-5 py-20">
          <NoAsset chainName={name} isOpen={isValidatorsModalOpen} onClose={closeValidatorsModal} />
        </div>
      </BaseModal>
    );
  }

  const onInitResult = ({ accounts, signer, description }: ValidatorsResult) => {
    if (signer && isMultisigWallet) {
      setSigner(signer);
      setDescription(description || '');
    }

    setTxAccounts(accounts);
    setActiveStep(Step.VALIDATORS);
  };

  const onSelectValidators = (validators: ValidatorMap) => {
    const transactions = getNominateTxs(Object.keys(validators));

    if (signer && isMultisigWallet) {
      setWrappers([
        {
          signatoryId: signer.accountId,
          account: txAccounts[0],
        },
      ]);
    }

    setTxs(transactions);
    setValidators(validators);
    setActiveStep(Step.CONFIRMATION);
  };

  const getNominateTxs = (validators: Address[]): Transaction[] => {
    return txAccounts.map(({ accountId }) => {
      const address = toAddress(accountId, { prefix: addressPrefix });

      return buildTransaction(TransactionType.NOMINATE, address, chainId, { targets: validators });
    });
  };

  const onSignResult = (signatures: HexString[], unsigned: UnsignedTransaction[]) => {
    setUnsignedTransactions(unsigned);
    setSignatures(signatures);
    setActiveStep(Step.SUBMIT);
  };

  const explorersProps = { explorers, addressPrefix, asset };
  const multisigTx = isMultisigWallet ? wrapTx(txs[0], api, addressPrefix) : undefined;

  return (
    <>
      <BaseModal
        closeButton
        contentClass=""
        panelClass="w-max"
        headerClass="py-3 pl-5 pr-3"
        isOpen={activeStep !== Step.SUBMIT && isValidatorsModalOpen}
        title={<OperationTitle title={t('staking.validators.title')} chainId={chainId} />}
        onClose={closeValidatorsModal}
      >
        {activeStep === Step.INIT && (
          <InitOperation api={api} chainId={chainId} accounts={accounts} onResult={onInitResult} {...explorersProps} />
        )}
        {activeStep === Step.VALIDATORS && (
          <Validators
            api={api}
            chainId={chainId}
            asset={asset}
            explorers={explorers}
            addressPrefix={addressPrefix}
            isLightClient={networkUtils.isLightClientConnection(connection)}
            onResult={onSelectValidators}
            onGoBack={goToPrevStep}
          />
        )}
        {activeStep === Step.CONFIRMATION && (
          <Confirmation
            api={api}
            accounts={txAccounts}
            validators={Object.values(validators)}
            description={description}
            transaction={txs[0]}
            signer={signer}
            onResult={() => setActiveStep(Step.SIGNING)}
            onGoBack={goToPrevStep}
            {...explorersProps}
          >
            <StakingPopover labelText={t('staking.confirmation.hintTitle')}>
              <StakingPopover.Item>{t('staking.confirmation.hintNewValidators')}</StakingPopover.Item>
            </StakingPopover>
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
          onClose={toggleValidatorsModal}
        />
      )}
    </>
  );
};

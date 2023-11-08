import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useUnit } from 'effector-react';

import { DEFAULT_TRANSITION, getRelaychainAsset, toAddress } from '@renderer/shared/lib/utils';
import { ValidatorMap } from '@renderer/entities/staking';
import { useI18n, useNetworkContext } from '@renderer/app/providers';
import { Paths } from '@renderer/shared/routes';
import { Transaction, TransactionType, useTransaction } from '@renderer/entities/transaction';
import { Confirmation, NoAsset, Submit, Validators } from '../components';
import { useToggle } from '@renderer/shared/lib/hooks';
import { RewardsDestination } from '@renderer/shared/core';
import type { Account, Address, ChainId, HexString } from '@renderer/shared/core';
import { BaseModal, Button, Loader } from '@renderer/shared/ui';
import InitOperation, { BondResult } from './InitOperation/InitOperation';
import { OperationTitle } from '@renderer/components/common';
import { DestinationType } from '../common/types';
import { UnstakingDuration } from '@renderer/pages/Staking/Overview/components';
import { isLightClient } from '@renderer/entities/network';
import { Signing } from '@renderer/features/operation';
import { walletUtils, walletModel } from '@renderer/entities/wallet';
import { priceProviderModel } from '@renderer/entities/price';
import { StakingPopover } from '../components/StakingPopover/StakingPopover';

const enum Step {
  INIT,
  VALIDATORS,
  CONFIRMATION,
  SIGNING,
  SUBMIT,
}

export const Bond = () => {
  const { t } = useI18n();
  const activeWallet = useUnit(walletModel.$activeWallet);
  const activeAccounts = useUnit(walletModel.$activeAccounts);

  const navigate = useNavigate();
  const { connections } = useNetworkContext();
  const { setTxs, txs, setWrappers, wrapTx, buildTransaction } = useTransaction();
  const [searchParams] = useSearchParams();
  const params = useParams<{ chainId: ChainId }>();

  const [isBondModalOpen, toggleBondModal] = useToggle(true);

  const [activeStep, setActiveStep] = useState<Step>(Step.INIT);
  const [validators, setValidators] = useState<ValidatorMap>({});
  const [txAccounts, setTxAccounts] = useState<Account[]>([]);

  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [destination, setDestination] = useState<DestinationType>();
  const [description, setDescription] = useState('');

  const [unsignedTransactions, setUnsignedTransactions] = useState<UnsignedTransaction[]>([]);

  const [accounts, setAccounts] = useState<Account[]>([]);
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
  }, [activeAccounts.length, activeAccounts.length && activeAccounts[0].accountId]);

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

  const closeBondModal = () => {
    toggleBondModal();
    setTimeout(() => navigate(Paths.STAKING), DEFAULT_TRANSITION);
  };

  if (!api?.isConnected) {
    return (
      <BaseModal
        closeButton
        contentClass=""
        headerClass="py-3 px-5 max-w-[440px]"
        panelClass="w-max"
        isOpen={isBondModalOpen}
        title={<OperationTitle title={t('staking.bond.title')} chainId={chainId} />}
        onClose={closeBondModal}
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
        isOpen={isBondModalOpen}
        title={<OperationTitle title={t('staking.bond.title')} chainId={chainId} />}
        onClose={closeBondModal}
      >
        <div className="w-[440px] px-5 py-20">
          <NoAsset chainName={name} isOpen={isBondModalOpen} onClose={closeBondModal} />
        </div>
      </BaseModal>
    );
  }

  const onInitResult = ({ accounts, destination, amount, signer, description }: BondResult) => {
    const destPayload = destination
      ? { type: RewardsDestination.TRANSFERABLE, address: destination }
      : { type: RewardsDestination.RESTAKE };

    if (signer && isMultisigWallet) {
      setSigner(signer);
      setDescription(description || '');
    }

    setDestination(destPayload);
    setTxAccounts(accounts);
    setStakeAmount(amount);
    setActiveStep(Step.VALIDATORS);
  };

  const onSelectValidators = (validators: ValidatorMap) => {
    const transactions = getBondTxs(Object.keys(validators));

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

  const getBondTxs = (validators: Address[]): Transaction[] => {
    return txAccounts.map(({ accountId }) => {
      const address = toAddress(accountId, { prefix: addressPrefix });

      const bondTx = buildTransaction(TransactionType.BOND, address, chainId, {
        value: stakeAmount,
        controller: address,
        payee: destination?.type === RewardsDestination.TRANSFERABLE ? { Account: destination.address } : 'Staked',
      });

      const nominateTx = buildTransaction(TransactionType.NOMINATE, address, chainId, { targets: validators });

      return buildTransaction(TransactionType.BATCH_ALL, address, chainId, { transactions: [bondTx, nominateTx] });
    });
  };

  const onSignResult = (signatures: HexString[], unsigned: UnsignedTransaction[]) => {
    setUnsignedTransactions(unsigned);
    setSignatures(signatures);
    setActiveStep(Step.SUBMIT);
  };

  const explorersProps = { explorers, addressPrefix, asset };
  const bondValues = new Array(txAccounts.length).fill(stakeAmount);
  const multisigTx = isMultisigWallet ? wrapTx(txs[0], api, addressPrefix) : undefined;
  const eraLength = api.consts?.staking?.sessionsPerEra.toNumber() || 0;

  return (
    <>
      <BaseModal
        closeButton
        contentClass=""
        panelClass="w-max"
        headerClass="py-3 px-5 max-w-[440px]"
        isOpen={activeStep !== Step.SUBMIT && isBondModalOpen}
        title={<OperationTitle title={t('staking.bond.title', { asset: asset.symbol })} chainId={chainId} />}
        onClose={closeBondModal}
      >
        {activeStep === Step.INIT && (
          <InitOperation api={api} chainId={chainId} accounts={accounts} onResult={onInitResult} {...explorersProps} />
        )}
        {activeStep === Step.VALIDATORS && (
          <Validators
            api={api}
            chainId={chainId}
            isLightClient={isLightClient(connection)}
            onResult={onSelectValidators}
            onGoBack={goToPrevStep}
            {...explorersProps}
          />
        )}
        {activeStep === Step.CONFIRMATION && (
          <Confirmation
            api={api}
            validators={Object.values(validators)}
            accounts={txAccounts}
            signer={signer}
            amounts={bondValues}
            description={description}
            destination={destination}
            transaction={txs[0]}
            onResult={() => setActiveStep(Step.SIGNING)}
            onGoBack={goToPrevStep}
            {...explorersProps}
          >
            <StakingPopover labelText={t('staking.confirmation.hintTitleStartStaking')}>
              <ul className="flex flex-col gap-y-1 list-disc pl-5">
                <li>
                  {t('staking.confirmation.hintRewards')}
                  {` (${t('time.hours_other', { count: eraLength })})`}
                </li>
                <li>
                  {t('staking.confirmation.hintUnstakePeriod')} {'('}
                  <UnstakingDuration api={api} />
                  {')'}
                </li>
                <li>{t('staking.confirmation.hintNoRewards')}</li>
                <li>{t('staking.confirmation.hintWithdraw')}</li>
              </ul>
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
          onClose={toggleBondModal}
        />
      )}
    </>
  );
};

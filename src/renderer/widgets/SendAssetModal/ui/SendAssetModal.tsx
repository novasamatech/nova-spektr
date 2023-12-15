import { useState, useEffect } from 'react';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useStore, useGate, useUnit } from 'effector-react';
import { useNavigate } from 'react-router-dom';

import { useI18n } from '@app/providers';
import { Paths } from '@shared/routes';
import { Transaction, useTransaction, validateBalance } from '@entities/transaction';
import { BaseModal, Button, Loader } from '@shared/ui';
import { Confirmation, InitOperation, Submit } from './components/ActionSteps';
import { Signing } from '@features/operation';
import { OperationTitle } from '@renderer/components/common';
import { useToggle } from '@shared/lib/hooks';
import * as sendAssetModel from '../model/send-asset';
import type { Chain, Asset, Account, MultisigAccount, HexString } from '@shared/core';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import { priceProviderModel } from '@entities/price';
import { useNetworkData } from '@entities/network';
import { balanceModel, balanceUtils } from '@entities/balance';

const enum Step {
  INIT,
  CONFIRMATION,
  SIGNING,
  SUBMIT,
}

type Props = {
  chain: Chain;
  asset: Asset;
};

export const SendAssetModal = ({ chain, asset }: Props) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { api, chain: chainData, extendedChain } = useNetworkData(chain.chainId);

  const balances = useUnit(balanceModel.$balances);
  const activeWallet = useUnit(walletModel.$activeWallet);

  const { getTransactionFee, setTxs, txs, setWrappers, wrapTx } = useTransaction();
  const config = useStore(sendAssetModel.$finalConfig);
  const xcmAsset = useStore(sendAssetModel.$xcmAsset);
  const destinationChain = useStore(sendAssetModel.$destinationChain);

  const [isModalOpen, toggleIsModalOpen] = useToggle(true);
  const [activeStep, setActiveStep] = useState<Step>(Step.INIT);
  const [account, setAccount] = useState<Account | MultisigAccount>({} as Account);
  const [signatory, setSignatory] = useState<Account>();
  const [description, setDescription] = useState('');
  const [unsignedTx, setUnsignedTx] = useState<UnsignedTransaction>({} as UnsignedTransaction);
  const [signature, setSignature] = useState<HexString>('0x0');

  const { assets, addressPrefix, explorers } = chainData;

  useEffect(() => {
    priceProviderModel.events.assetsPricesRequested({ includeRates: true });
  }, []);

  useEffect(() => {
    if (isModalOpen && walletUtils.isWatchOnly(activeWallet)) {
      toggleIsModalOpen();
    }
  }, [activeWallet]);

  useGate(sendAssetModel.PropsGate, { chain, asset, api });

  useEffect(() => {
    sendAssetModel.events.xcmConfigRequested();

    return () => {
      sendAssetModel.events.storeCleared();
    };
  }, []);

  useEffect(() => {
    if (signatory && account) {
      setWrappers([
        {
          signatoryId: signatory.accountId,
          account: account as MultisigAccount,
        },
      ]);
    }
  }, [account, signatory]);

  const onInitResult = (transferTx: Transaction, description?: string) => {
    setTxs([transferTx]);
    setDescription(description || '');
    setActiveStep(Step.CONFIRMATION);
  };

  const transaction = txs[0];

  const checkBalance = () =>
    validateBalance({
      api,
      transaction: api && wrapTx(transaction, api, addressPrefix),
      chainId: chain.chainId,
      assetId: asset.assetId.toString(),
      getBalance: balanceUtils.getBalanceWrapped(balances),
      getTransactionFee: (transaction, api) => getTransactionFee(transaction, api),
    });

  const onConfirmResult = () => {
    setActiveStep(Step.SIGNING);
  };

  const onSignResult = (signature: HexString[], tx: UnsignedTransaction[]) => {
    setUnsignedTx(tx[0]);
    setSignature(signature[0]);
    setActiveStep(Step.SUBMIT);
  };

  const closeSendModal = () => {
    toggleIsModalOpen();
    // TODO: rework to context-free solution
    navigate(Paths.ASSETS);
  };

  const closeSendModalFromSubmit = () => {
    toggleIsModalOpen();
  };

  const onSignatoryChange = (signatory: Account) => {
    setSignatory(signatory);
  };

  const commonProps = { explorers, addressPrefix };

  if (activeStep === Step.SUBMIT) {
    return api ? (
      <Submit
        tx={transaction}
        multisigTx={accountUtils.isMultisigAccount(account) ? wrapTx(transaction, api, addressPrefix) : undefined}
        account={account}
        unsignedTx={unsignedTx}
        signature={signature}
        description={description}
        api={api}
        onClose={closeSendModalFromSubmit}
        {...commonProps}
      />
    ) : (
      <div className="w-[240px] h-[200px] px-5 py-4">
        <Loader className="my-24 mx-auto" color="primary" size={25} />
      </div>
    );
  }

  const operationTitle =
    destinationChain && destinationChain !== chain.chainId ? 'transfer.xcmTitle' : 'transfer.title';

  return (
    <BaseModal
      closeButton
      isOpen={isModalOpen}
      title={<OperationTitle title={`${t(operationTitle, { asset: asset.symbol })}`} chainId={chain.chainId} />}
      contentClass=""
      panelClass="w-[440px]"
      headerClass="py-3 pl-5 pr-3"
      onClose={closeSendModal}
    >
      {!api?.isConnected ? (
        <div>
          <Loader className="my-24 mx-auto" color="primary" size={25} />
          <Button disabled className="w-fit flex-0 mt-7 ml-auto">
            {t('transfer.continueButton')}
          </Button>
        </div>
      ) : (
        <>
          {activeStep === Step.INIT && (
            <InitOperation
              chainId={chain.chainId}
              asset={asset}
              nativeToken={assets[0]}
              network={chain.name}
              api={api}
              tx={transaction}
              onTxChange={setTxs}
              onResult={onInitResult}
              onAccountChange={setAccount}
              onSignatoryChange={onSignatoryChange}
              {...commonProps}
            />
          )}
          {activeStep === Step.CONFIRMATION && (
            <Confirmation
              transaction={transaction}
              config={config || undefined}
              xcmAsset={xcmAsset || undefined}
              description={description}
              account={account}
              signatory={signatory}
              connection={extendedChain}
              onBack={() => setActiveStep(Step.INIT)}
              onResult={onConfirmResult}
            />
          )}
          {activeStep === Step.SIGNING && (
            <Signing
              chainId={chain.chainId}
              api={api}
              addressPrefix={addressPrefix}
              accounts={[account]}
              signatory={signatory}
              transactions={[wrapTx(transaction, api, addressPrefix)]}
              validateBalance={checkBalance}
              onGoBack={() => setActiveStep(Step.CONFIRMATION)}
              onResult={onSignResult}
            />
          )}
        </>
      )}
    </BaseModal>
  );
};

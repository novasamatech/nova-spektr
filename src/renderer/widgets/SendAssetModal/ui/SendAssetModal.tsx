import { useState, useEffect } from 'react';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useStore } from 'effector-react';

import { useI18n, useNetworkContext } from '@renderer/app/providers';
import { HexString } from '@renderer/domain/shared-kernel';
import { Transaction, useTransaction, validateBalance } from '@renderer/entities/transaction';
import { Account, MultisigAccount } from '@renderer/entities/account';
import { BaseModal, Button, Loader } from '@renderer/shared/ui';
import { Confirmation, InitOperation, Submit } from './components/ActionSteps';
import { Signing } from '@renderer/features/operation';
import { Asset, useBalance } from '@renderer/entities/asset';
import { OperationTitle } from '@renderer/components/common';
import { Chain } from '@renderer/entities/chain';
import { DEFAULT_TRANSITION } from '@renderer/shared/lib/utils';
import { useToggle } from '@renderer/shared/lib/hooks';
import * as sendAssetModel from '../model/send-asset';

const enum Step {
  INIT,
  CONFIRMATION,
  SIGNING,
  SUBMIT,
}

type Props = {
  chain: Chain;
  asset: Asset;
  onClose: () => void;
};

export const SendAssetModal = ({ chain, asset, onClose }: Props) => {
  const { t } = useI18n();
  const { getBalance } = useBalance();
  const { getTransactionFee } = useTransaction();
  const { connections } = useNetworkContext();
  const config = useStore(sendAssetModel.$finalConfig);
  const xcmAsset = useStore(sendAssetModel.$xcmAsset);
  const destinationChain = useStore(sendAssetModel.$destinationChain);

  const [isModalOpen, toggleIsModalOpen] = useToggle(true);
  const [activeStep, setActiveStep] = useState<Step>(Step.INIT);
  const [account, setAccount] = useState<Account | MultisigAccount>({} as Account);
  const [signatory, setSignatory] = useState<Account>();
  const [description, setDescription] = useState('');
  const [transferTx, setTransferTx] = useState<Transaction>({} as Transaction);
  const [multisigTx, setMultisigTx] = useState<Transaction>();
  const [unsignedTx, setUnsignedTx] = useState<UnsignedTransaction>({} as UnsignedTransaction);
  const [signature, setSignature] = useState<HexString>('0x0');

  const connection = connections[chain.chainId];
  const transaction = multisigTx || transferTx;

  const { api, assets, addressPrefix, explorers } = connection;

  useEffect(() => {
    sendAssetModel.events.xcmConfigRequested();
  }, []);

  useEffect(() => {
    api && sendAssetModel.events.apiInited(api);
  }, [api]);

  const onInitResult = (transferTx: Transaction, multisig?: { multisigTx: Transaction; description: string }) => {
    setTransferTx(transferTx);
    setMultisigTx(multisig?.multisigTx || undefined);
    setDescription(multisig?.description || '');
    setActiveStep(Step.CONFIRMATION);
  };

  const checkBalance = () =>
    validateBalance({
      api,
      transaction,
      chainId: chain.chainId,
      assetId: asset.assetId.toString(),
      getBalance,
      getTransactionFee,
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
    setTimeout(onClose, DEFAULT_TRANSITION);
  };

  const commonProps = { explorers, addressPrefix };

  if (activeStep === Step.SUBMIT) {
    return api ? (
      <Submit
        tx={transferTx}
        multisigTx={multisigTx}
        account={account}
        unsignedTx={unsignedTx}
        signature={signature}
        description={description}
        api={api}
        onClose={closeSendModal}
        {...commonProps}
      />
    ) : (
      <div className="w-[240px] h-[200px] px-5 py-4">
        <Loader className="my-24 mx-auto" color="primary" size={25} />
      </div>
    );
  }

  const operationTitle = destinationChain?.chainId !== chain.chainId ? 'transfer.xcmTitle' : 'transfer.title';

  return (
    <BaseModal
      closeButton
      isOpen={isModalOpen}
      title={<OperationTitle title={`${t(operationTitle, { asset: asset?.symbol })}`} chainId={chain.chainId} />}
      contentClass={activeStep === Step.SIGNING ? '' : undefined}
      panelClass="w-[440px]"
      headerClass="py-3 px-5 max-w-[440px]"
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
          {activeStep === Step.INIT && asset && (
            <InitOperation
              chainId={chain.chainId}
              asset={asset}
              nativeToken={assets[0]}
              network={chain.name}
              api={api}
              onResult={onInitResult}
              onAccountChange={setAccount}
              onSignatoryChange={setSignatory}
              {...commonProps}
            />
          )}
          {activeStep === Step.CONFIRMATION && (
            <Confirmation
              config={config || undefined}
              xcmAsset={xcmAsset || undefined}
              transaction={transferTx}
              description={description}
              feeTx={transferTx}
              account={account}
              signatory={signatory}
              connection={connection}
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
              transactions={[transaction]}
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

import { useState } from 'react';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';

import { useI18n, useNetworkContext } from '@renderer/app/providers';
import { HexString } from '@renderer/domain/shared-kernel';
import { Transaction } from '@renderer/entities/transaction';
import { Account, isMultishard, isMultisig, MultisigAccount } from '@renderer/entities/account';
import { useCountdown, useToggle } from '@renderer/shared/lib/hooks';
import { BaseModal, Button, Loader } from '@renderer/shared/ui';
import ScanSingleframeQr from '@renderer/components/common/Scanning/ScanSingleframeQr';
import { OperationTitle } from '@renderer/components/common';
import { Confirmation, InitOperation, Signing, Submit } from './components/ActionSteps';
import { Chain } from '@renderer/entities/chain';
import { Asset } from '@renderer/entities/asset';
import { DEFAULT_TRANSITION } from '@renderer/shared/lib/utils';

const enum Step {
  INIT,
  CONFIRMATION,
  SCANNING,
  SIGNING,
  SUBMIT,
}

type Props = {
  chain: Chain;
  asset: Asset;
  onClose: () => void;
};

// TODO: Divide into model + feature/entity
export const SendAssetModal = ({ chain, asset, onClose }: Props) => {
  const { t } = useI18n();
  const { connections } = useNetworkContext();

  const [isModalOpen, toggleIsModalOpen] = useToggle(true);
  const [activeStep, setActiveStep] = useState<Step>(Step.INIT);
  const [account, setAccount] = useState<Account | MultisigAccount>({} as Account);
  const [signatory, setSignatory] = useState<Account>();
  const [description, setDescription] = useState('');
  const [transferTx, setTransferTx] = useState<Transaction>({} as Transaction);
  const [multisigTx, setMultisigTx] = useState<Transaction>();
  const [unsignedTx, setUnsignedTx] = useState<UnsignedTransaction>({} as UnsignedTransaction);
  const [txPayload, setTxPayload] = useState<Uint8Array>();
  const [signature, setSignature] = useState<HexString>('0x0');

  const connection = connections[chain.chainId];
  const { api, assets, addressPrefix, explorers } = connection;

  const [countdown, resetCountdown] = useCountdown(connection?.api);

  const onInitResult = (transferTx: Transaction, multisig?: { multisigTx: Transaction; description: string }) => {
    setTransferTx(transferTx);
    setMultisigTx(multisig?.multisigTx || undefined);
    setDescription(multisig?.description || '');
    setActiveStep(Step.CONFIRMATION);
  };

  const onConfirmResult = () => {
    setActiveStep(Step.SCANNING);
  };

  const onSignResult = (signature: HexString) => {
    setSignature(signature);
    setActiveStep(Step.SUBMIT);
  };

  const onAccountChange = (account: Account | MultisigAccount) => {
    setAccount(account);
  };

  const onStartOver = () => {
    setActiveStep(Step.INIT);
  };

  const onScanResult = (tx: UnsignedTransaction, payload: Uint8Array) => {
    setUnsignedTx(tx);
    setActiveStep(Step.SIGNING);
    setTxPayload(payload);
  };

  const getSignatory = (): Account | undefined => {
    return isMultisig(account) ? signatory : isMultishard(account) ? account : undefined;
  };

  const closeSendModal = () => {
    toggleIsModalOpen();
    setTimeout(onClose, DEFAULT_TRANSITION);
  };

  const commonProps = { explorers, addressPrefix };

  if (activeStep === Step.SUBMIT) {
    return api ? (
      <Submit
        api={api}
        tx={transferTx}
        multisigTx={multisigTx}
        account={account}
        unsignedTx={unsignedTx}
        signature={signature}
        description={description}
        onClose={closeSendModal}
        {...commonProps}
      />
    ) : (
      <div className="w-[240px] h-[200px] px-5 py-4">
        <Loader className="my-24 mx-auto" color="primary" size={25} />
      </div>
    );
  }

  return (
    <BaseModal
      closeButton
      isOpen={isModalOpen}
      title={<OperationTitle title={`${t('transfer.title', { asset: asset.symbol })}`} chainId={chain.chainId} />}
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
          {activeStep === Step.INIT && (
            <InitOperation
              chainId={chain.chainId}
              asset={asset}
              nativeToken={assets[0]}
              network={chain.name}
              api={api}
              onResult={onInitResult}
              onAccountChange={onAccountChange}
              onSignatoryChange={setSignatory}
              {...commonProps}
            />
          )}
          {activeStep === Step.CONFIRMATION && (
            <Confirmation
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
          {activeStep === Step.SCANNING && (
            <ScanSingleframeQr
              chainId={chain.chainId}
              account={getSignatory()}
              transaction={multisigTx || transferTx}
              countdown={countdown}
              api={api}
              onResetCountdown={resetCountdown}
              onResult={onScanResult}
              onGoBack={() => setActiveStep(Step.CONFIRMATION)}
              {...commonProps}
            />
          )}
          {activeStep === Step.SIGNING && (
            <Signing
              chainId={chain.chainId}
              transaction={multisigTx || transferTx}
              assetId={asset.assetId.toString()}
              countdown={countdown}
              api={api}
              accountId={(signatory || account).accountId}
              txPayload={txPayload}
              onGoBack={() => setActiveStep(Step.SCANNING)}
              onStartOver={onStartOver}
              onResult={onSignResult}
              {...commonProps}
            />
          )}
        </>
      )}
    </BaseModal>
  );
};

import { useState, useEffect } from 'react';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';

import { useI18n } from '@renderer/context/I18nContext';
import { ChainId, HexString } from '@renderer/domain/shared-kernel';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { useChains } from '@renderer/services/network/chainsService';
import { Transaction } from '@renderer/domain/transaction';
import { Account, MultisigAccount } from '@renderer/domain/account';
import { useCountdown } from '@renderer/shared/hooks';
import { BaseModal, Button } from '@renderer/components/ui-redesign';
import OperationModalTitle from '../Operations/components/OperationModalTitle';
import { InitOperation, Confirmation, Signing, Submit } from './components/ActionSteps';
import ScanSingleframeQr from '@renderer/components/common/Scanning/ScanSingleframeQr';
import { Loader } from '@renderer/components/ui';

const enum Step {
  INIT,
  CONFIRMATION,
  SCANNING,
  SIGNING,
  SUBMIT,
}

type Props = {
  assetId: number;
  chainId: ChainId;
  isOpen: boolean;
  onClose?: () => void;
};

const Transfer = ({ assetId, chainId, isOpen, onClose }: Props) => {
  const { t } = useI18n();
  const { getChainById } = useChains();
  const { connections } = useNetworkContext();

  const [activeStep, setActiveStep] = useState<Step>(Step.INIT);
  const [chainName, setChainName] = useState('...');
  const [account, setAccount] = useState<Account | MultisigAccount>({} as Account);
  const [signatory, setSignatory] = useState<Account>();
  const [description, setDescription] = useState('');
  const [transferTx, setTransferTx] = useState<Transaction>({} as Transaction);
  const [multisigTx, setMultisigTx] = useState<Transaction>();
  const [unsignedTx, setUnsignedTx] = useState<UnsignedTransaction>({} as UnsignedTransaction);
  const [signature, setSignature] = useState<HexString>('0x0');

  const connection = connections[chainId];
  const [countdown, resetCountdown] = useCountdown(connection?.api);

  useEffect(() => {
    getChainById(chainId).then((chain) => setChainName(chain?.name || ''));
  }, []);

  const { api, assets, addressPrefix, explorers } = connection;
  const asset = assets.find((a) => a.assetId === assetId);

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
    onClose?.();
  };

  const onAccountChange = (account: Account | MultisigAccount) => {
    setAccount(account);
  };

  const onStartOver = () => {
    setActiveStep(Step.INIT);
  };

  const handleClose = () => {
    onClose?.();
    setActiveStep(Step.INIT);
    setSignatory(undefined);
  };

  const commonProps = { explorers, addressPrefix };

  return (
    <>
      <BaseModal
        closeButton
        isOpen={activeStep !== Step.SUBMIT && isOpen}
        title={<OperationModalTitle title={`${t('transfer.title', { asset: asset?.symbol })}`} chainId={chainId} />}
        contentClass={activeStep === Step.SIGNING ? '' : undefined}
        panelClass="w-[440px]"
        headerClass="py-4 px-5 max-w-[440px]"
        onClose={handleClose}
      >
        {!api?.isConnected ? (
          <div>
            <Loader className="my-24 mx-auto" color="primary" />
            <Button disabled className="w-fit flex-0 mt-7 ml-auto">
              {t('transfer.continueButton')}
            </Button>
          </div>
        ) : (
          <>
            {activeStep === Step.INIT && (
              <InitOperation
                chainId={chainId}
                asset={asset}
                nativeToken={assets[0]}
                network={chainName}
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
                chainId={chainId}
                account={signatory || account}
                transaction={multisigTx || transferTx}
                countdown={countdown}
                api={api}
                onResetCountdown={resetCountdown}
                onResult={(tx) => {
                  setUnsignedTx(tx);
                  setActiveStep(Step.SIGNING);
                }}
                onGoBack={() => setActiveStep(Step.CONFIRMATION)}
                {...commonProps}
              />
            )}
            {activeStep === Step.SIGNING && (
              <Signing
                chainId={chainId}
                transaction={multisigTx || transferTx}
                assetId={assetId.toString()}
                countdown={countdown}
                api={api}
                onGoBack={() => setActiveStep(Step.SCANNING)}
                onStartOver={onStartOver}
                onResult={onSignResult}
                {...commonProps}
              />
            )}
          </>
        )}
      </BaseModal>

      {activeStep === Step.SUBMIT && (
        <>
          {api ? (
            <Submit
              tx={transferTx}
              multisigTx={multisigTx}
              account={account}
              unsignedTx={unsignedTx}
              signature={signature}
              description={description}
              api={api}
              onClose={handleClose}
              {...commonProps}
            />
          ) : (
            <div className="w-[240px] h-[200px] px-5 py-4">
              <Loader className="my-24 mx-auto" color="primary" />
            </div>
          )}
        </>
      )}
    </>
  );
};

export default Transfer;

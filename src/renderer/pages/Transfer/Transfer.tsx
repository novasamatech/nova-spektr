import { useEffect, useState } from 'react';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';

import { useI18n, useNetworkContext } from '@renderer/app/providers';
import { ChainId, HexString } from '@renderer/domain/shared-kernel';
import { useChains } from '@renderer/entities/network';
import { Transaction, useTransaction, validateBalance } from '@renderer/entities/transaction';
import { Account, MultisigAccount } from '@renderer/entities/account';
import { BaseModal, Button, Loader } from '@renderer/shared/ui';
import OperationModalTitle from '../Operations/components/OperationModalTitle';
import { Confirmation, InitOperation, Submit } from './components/ActionSteps';
import { Signing } from '@renderer/features/operation';
import { useBalance } from '@renderer/entities/asset';

const enum Step {
  INIT,
  CONFIRMATION,
  SIGNING,
  SUBMIT,
}

type Props = {
  assetId: number;
  chainId: ChainId;
  isOpen: boolean;
  onClose?: () => void;
};

export const Transfer = ({ assetId, chainId, isOpen, onClose }: Props) => {
  const { t } = useI18n();
  const { getChainById } = useChains();
  const { getBalance } = useBalance();
  const { getTransactionFee } = useTransaction();
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
  const transaction = multisigTx || transferTx;

  useEffect(() => {
    getChainById(chainId).then((chain) => setChainName(chain?.name || ''));
  }, []);

  useEffect(() => {
    isOpen && setActiveStep(Step.INIT);
  }, [isOpen]);

  const { api, assets, addressPrefix, explorers } = connection;
  const asset = assets.find((a) => a.assetId === assetId);

  const onInitResult = (transferTx: Transaction, multisig?: { multisigTx: Transaction; description: string }) => {
    setTransferTx(transferTx);
    setMultisigTx(multisig?.multisigTx || undefined);
    setDescription(multisig?.description || '');
    setActiveStep(Step.CONFIRMATION);
  };

  const checkBalance = () =>
    validateBalance({
      api,
      chainId,
      transaction,
      assetId: assetId.toString(),
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

  const onAccountChange = (account: Account | MultisigAccount) => {
    setAccount(account);
  };

  const handleClose = () => {
    onClose?.();
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
        headerClass="py-3 px-5 max-w-[440px]"
        onClose={handleClose}
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
            {activeStep === Step.SIGNING && (
              <Signing
                chainId={chainId}
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
              <Loader className="my-24 mx-auto" color="primary" size={25} />
            </div>
          )}
        </>
      )}
    </>
  );
};

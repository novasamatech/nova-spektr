import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';

import { useI18n } from '@renderer/context/I18nContext';
import { ButtonBack, Icon, ButtonLink } from '@renderer/components/ui';
import { ChainLoader } from '@renderer/components/common';
import Paths from '@renderer/routes/paths';
import { ChainId, HexString } from '@renderer/domain/shared-kernel';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { useChains } from '@renderer/services/network/chainsService';
import { Transaction } from '@renderer/domain/transaction';
import { Account, MultisigAccount } from '@renderer/domain/account';
import { useCountdown, useToggle } from '@renderer/shared/hooks';
import { BaseModal, Button, IconButton } from '@renderer/components/ui-redesign';
import OperationModalTitle from '../Operations/components/OperationModalTitle';
import { InitOperation, Confirmation, Scanning, Signing, Submit } from './components/ActionSteps';

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
};

const Transfer = ({ assetId, chainId }: Props) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { getChainById } = useChains();
  const { connections } = useNetworkContext();

  const [isModalOpen, toggleModal] = useToggle();
  const [activeStep, setActiveStep] = useState<Step>(Step.INIT);
  const [chainName, setChainName] = useState('...');
  const [account, setAccount] = useState<Account | MultisigAccount>({} as Account);
  const [signatory, setSignatory] = useState<Account>();
  const [description, setDescription] = useState('');
  const [transferTx, setTransferTx] = useState<Transaction>({} as Transaction);
  const [multisigTx, setMultisigTx] = useState<Transaction>();
  const [unsignedTx, setUnsignedTx] = useState<UnsignedTransaction>({} as UnsignedTransaction);
  const [signature, setSignature] = useState<HexString>('0x0');

  const [isQrExpired, setIsQrExpired] = useState(false);

  useEffect(() => {
    getChainById(chainId).then((chain) => setChainName(chain?.name || ''));
  }, []);

  const connection = connections[chainId];
  const [countdown, resetCountdown] = useCountdown(connection?.api);

  if (!connection?.api?.isConnected) {
    return <ChainLoader chainName={chainName} />;
  }

  const { api, assets, addressPrefix, explorers, name: network } = connection;
  const asset = assets.find((a) => a.assetId === assetId);

  const goToPrevStep = () => {
    if (activeStep === Step.INIT) {
      navigate(Paths.BALANCES);
    } else {
      setActiveStep((prev) => prev - 1);
    }
  };

  const headerContent = (
    <div className="flex items-center gap-x-2.5 mt-5 mb-9 px-5">
      <ButtonBack onCustomReturn={goToPrevStep}>
        <p className="font-semibold text-2xl text-neutral-variant">{t('balances.title')}</p>
        <p className="font-semibold text-2xl text-neutral">/</p>
        <h1 className="font-semibold text-2xl text-neutral">{t('transfer.title')}</h1>
      </ButtonBack>
    </div>
  );

  if (!asset) {
    return (
      <div className="flex flex-col h-full relative">
        {headerContent}

        <div className="flex w-full h-full flex-col items-center justify-center">
          <Icon name="noResults" size={380} />
          <p className="text-neutral text-3xl font-bold">{t('staking.bond.noStakingAssetLabel')}</p>
          <p className="text-neutral-variant text-base font-normal">
            {t('staking.bond.noStakingAssetDescription', { chainName: network })}
          </p>

          <ButtonLink className="mt-5" to={Paths.BALANCES} variant="fill" pallet="primary" weight="lg">
            {t('staking.bond.goToStakingButton')}
          </ButtonLink>
        </div>
      </div>
    );
  }

  const onInitResult = (transferTx: Transaction, multisig?: { multisigTx: Transaction; description: string }) => {
    setTransferTx(transferTx);
    setMultisigTx(multisig?.multisigTx || undefined);
    setDescription(multisig?.description || '');
    setActiveStep(Step.CONFIRMATION);
  };

  const onConfirmResult = () => {
    setActiveStep(Step.SCANNING);
  };

  const handleQrExpiredWhileSigning = () => {
    setIsQrExpired(true);
    setActiveStep(Step.SCANNING);
  };

  const onSignResult = (signature: HexString) => {
    setSignature(signature);
    setActiveStep(Step.SUBMIT);
    toggleModal();
  };

  const onAccountChange = (account: Account | MultisigAccount) => {
    setAccount(account);
  };

  const onStartOver = () => {
    setActiveStep(Step.INIT);
  };

  const handleClose = () => {
    toggleModal();
    setActiveStep(Step.INIT);
  };

  const commonProps = { api, explorers, addressPrefix };

  return (
    <>
      <IconButton name="sendArrow" onClick={toggleModal} />

      <BaseModal
        isOpen={isModalOpen}
        closeButton
        title={<OperationModalTitle title={`${t('transfer.title', { asset: asset.symbol })}`} chainId={chainId} />}
        contentClass={activeStep === Step.SIGNING ? '' : undefined}
        panelClass="w-[440px]"
        onClose={handleClose}
      >
        {activeStep === Step.INIT && (
          <InitOperation
            chainId={chainId}
            asset={asset}
            nativeToken={assets[0]}
            network={chainName}
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
          <>
            <Scanning
              chainId={chainId}
              account={signatory || account}
              transaction={multisigTx || transferTx}
              isQrExpired={isQrExpired}
              countdown={countdown}
              onResetCountdown={resetCountdown}
              onResult={setUnsignedTx}
              {...commonProps}
            />

            <div className="flex w-full justify-between">
              <Button variant="text" onClick={() => setActiveStep(Step.CONFIRMATION)}>
                {t('operation.goBackButton')}
              </Button>

              <Button onClick={() => setActiveStep(Step.SIGNING)}>{t('operation.continueButton')}</Button>
            </div>
          </>
        )}
        {activeStep === Step.SIGNING && (
          <Signing
            chainId={chainId}
            transaction={multisigTx || transferTx}
            assetId={assetId.toString()}
            countdown={countdown}
            onQrExpired={handleQrExpiredWhileSigning}
            onStartOver={onStartOver}
            onResult={onSignResult}
            {...commonProps}
          />
        )}
      </BaseModal>

      {activeStep === Step.SUBMIT && (
        <Submit
          tx={transferTx}
          multisigTx={multisigTx}
          account={account}
          unsignedTx={unsignedTx}
          signature={signature}
          description={description}
          {...commonProps}
        />
      )}
    </>
  );
};

export default Transfer;

import { useState, useEffect } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';

import { useI18n } from '@renderer/context/I18nContext';
import { ButtonBack, Icon, ButtonLink } from '@renderer/components/ui';
import { ChainLoader } from '@renderer/components/common';
import Paths from '@renderer/routes/paths';
import { ChainID, HexString } from '@renderer/domain/shared-kernel';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { InitOperation, Confirmation, Scanning, Signing, Submit } from './components';
import { useChains } from '@renderer/services/network/chainsService';
import { Transaction } from '@renderer/domain/transaction';
import { getAssetById } from '@renderer/shared/utils/assets';
import { useCountdown } from '@renderer/screens/Staking/Operations/hooks/useCountdown';
import { Account, MultisigAccount } from '@renderer/domain/account';

const enum Step {
  INIT,
  CONFIRMATION,
  SCANNING,
  SIGNING,
  SUBMIT,
}

const Transfer = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const params = useParams<{ chainId: ChainID; assetId: string }>();
  const { getChainById } = useChains();
  const { connections } = useNetworkContext();

  const [activeStep, setActiveStep] = useState<Step>(Step.INIT);
  const [chainName, setChainName] = useState('...');
  const [account, setAccount] = useState<Account | MultisigAccount>({} as Account);
  const [description, setDescription] = useState('');
  const [transferTx, setTransferTx] = useState<Transaction>({} as Transaction);
  const [multisigTx, setMultisigTx] = useState<Transaction>();
  const [unsignedTx, setUnsignedTx] = useState<UnsignedTransaction>({} as UnsignedTransaction);
  const [signature, setSignature] = useState<HexString>('0x0');

  const { chainId, assetId } = params;

  if (!chainId || !assetId) {
    return <Navigate replace to={Paths.BALANCES} />;
  }

  useEffect(() => {
    getChainById(chainId).then((chain) => setChainName(chain?.name || ''));
  }, []);

  const connection = connections[chainId];
  const [countdown, resetCountdown] = useCountdown(connection?.api);

  if (!connection?.api?.isConnected) {
    return <ChainLoader chainName={chainName} />;
  }

  const { api, assets, addressPrefix, explorers, name: network, icon } = connection;
  const asset = getAssetById(assetId, assets);

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

  const onScanResult = (unsignedTx: UnsignedTransaction) => {
    setUnsignedTx(unsignedTx);
    setActiveStep(Step.SIGNING);
  };

  const onBackToScan = () => {
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

  const commonProps = { api, explorers, addressPrefix };

  return (
    <div className="flex flex-col h-full relative">
      {headerContent}

      {activeStep === Step.INIT && (
        <InitOperation
          chainId={chainId}
          asset={asset}
          nativeToken={assets[0]}
          network={chainName}
          onResult={onInitResult}
          onAccountChange={onAccountChange}
          {...commonProps}
        />
      )}
      {activeStep === Step.CONFIRMATION && (
        <Confirmation
          asset={asset}
          nativeToken={assets[0]}
          transferTx={transferTx}
          multisigTx={multisigTx}
          accountName={account.name}
          icon={icon}
          network={network}
          onResult={onConfirmResult}
          {...commonProps}
        />
      )}
      {activeStep === Step.SCANNING && (
        <Scanning
          chainId={chainId}
          account={account}
          transaction={multisigTx || transferTx}
          countdown={countdown}
          onResetCountdown={resetCountdown}
          onResult={onScanResult}
          {...commonProps}
        />
      )}
      {activeStep === Step.SIGNING && (
        <Signing
          chainId={chainId}
          transaction={multisigTx || transferTx}
          account={account}
          assetId={assetId}
          countdown={countdown}
          onGoBack={onBackToScan}
          onStartOver={onStartOver}
          onResult={onSignResult}
          {...commonProps}
        />
      )}
      {activeStep === Step.SUBMIT && (
        <Submit
          asset={asset}
          nativeToken={assets[0]}
          transferTx={transferTx}
          account={account}
          description={description}
          multisigTx={multisigTx}
          icon={icon}
          network={network}
          signature={signature}
          unsignedTx={unsignedTx}
          {...commonProps}
        />
      )}
    </div>
  );
};

export default Transfer;

import { useState, useEffect } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';

import { useI18n } from '@renderer/context/I18nContext';
import { ButtonBack, Icon, ButtonLink } from '@renderer/components/ui';
import { ChainLoader } from '@renderer/components/common';
import Paths from '@renderer/routes/paths';
import { ChainId, HexString } from '@renderer/domain/shared-kernel';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { InitOperation, Confirmation, Scanning, Signing, Submit } from './components';
import { useChains } from '@renderer/services/network/chainsService';
import { Transaction } from '@renderer/domain/transaction';
import { getAssetById } from '@renderer/shared/utils/address';
import { useCountdown } from '@renderer/screens/Staking/Operations/hooks/useCountdown';

const enum Steps {
  INIT,
  CONFIRMATION,
  SCANNING,
  SIGNING,
  SUBMIT,
}

const Transfer = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const params = useParams<{ chainId: ChainId; assetId: string }>();
  const { getChainById } = useChains();
  const { connections } = useNetworkContext();

  const [activeStep, setActiveStep] = useState<Steps>(Steps.INIT);
  const [transaction, setTransaction] = useState<Transaction>({} as Transaction);
  const [chainName, setChainName] = useState('...');
  const [accountName, setAccountName] = useState<string>('');
  const [unsignedTx, setUnsignedTx] = useState<UnsignedTransaction>({} as UnsignedTransaction);
  const [signature, setSignature] = useState<HexString>('0x0');

  const { chainId, assetId } = params;

  if (!chainId || !assetId) {
    return <Navigate replace to={Paths.BALANCES} />;
  }

  const { api, assets, addressPrefix, explorers, name: network, icon } = connections[chainId];
  const asset = getAssetById(assets, assetId);
  const [countdown, resetCountdown] = useCountdown(api);

  useEffect(() => {
    getChainById(chainId).then((chain) => setChainName(chain?.name || ''));
  }, []);

  if (!api?.isConnected) {
    return <ChainLoader chainName={chainName} />;
  }

  const goToPrevStep = () => {
    if (activeStep === Steps.INIT) {
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

  const onInitResult = (transaction: Transaction) => {
    setTransaction(transaction);
    setActiveStep(Steps.CONFIRMATION);
  };

  const onConfirmResult = () => {
    setActiveStep(Steps.SCANNING);
  };

  const onScanResult = (unsignedTx: UnsignedTransaction) => {
    setUnsignedTx(unsignedTx);
    setActiveStep(Steps.SIGNING);
  };

  const onBackToScan = () => {
    setActiveStep(Steps.SCANNING);
  };

  const onSignResult = (signature: HexString) => {
    setSignature(signature);
    setActiveStep(Steps.SUBMIT);
  };

  const onAccountChange = (name: string) => {
    setAccountName(name);
  };

  const onStartOver = () => {
    setActiveStep(Steps.INIT);
  };

  return (
    <div className="flex flex-col h-full relative">
      {headerContent}

      {activeStep === Steps.INIT && (
        <InitOperation
          api={api}
          chainId={chainId}
          asset={asset}
          nativeToken={assets[0]}
          network={chainName}
          explorers={explorers}
          addressPrefix={addressPrefix}
          onResult={onInitResult}
          onAccountChange={onAccountChange}
        />
      )}
      {activeStep === Steps.CONFIRMATION && (
        <Confirmation
          api={api}
          asset={asset}
          nativeToken={assets[0]}
          transaction={transaction}
          explorers={explorers}
          addressPrefix={addressPrefix}
          accountName={accountName}
          icon={icon}
          network={network}
          onResult={onConfirmResult}
        />
      )}
      {activeStep === Steps.SCANNING && (
        <Scanning
          api={api}
          chainId={chainId}
          accountName={accountName}
          transaction={transaction}
          countdown={countdown}
          explorers={explorers}
          addressPrefix={addressPrefix}
          onResetCountdown={resetCountdown}
          onResult={onScanResult}
        />
      )}
      {activeStep === Steps.SIGNING && (
        <Signing
          api={api}
          chainId={chainId}
          transaction={transaction}
          accountName={accountName}
          assetId={assetId}
          countdown={countdown}
          explorers={explorers}
          addressPrefix={addressPrefix}
          onGoBack={onBackToScan}
          onStartOver={onStartOver}
          onResult={onSignResult}
        />
      )}
      {activeStep === Steps.SUBMIT && (
        <Submit
          api={api}
          asset={asset}
          nativeToken={assets[0]}
          transaction={transaction}
          explorers={explorers}
          addressPrefix={addressPrefix}
          accountName={accountName}
          icon={icon}
          network={network}
          signature={signature}
          unsignedTx={unsignedTx}
        />
      )}
    </div>
  );
};

export default Transfer;

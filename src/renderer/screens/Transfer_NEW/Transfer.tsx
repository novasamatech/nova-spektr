import { useState, useEffect } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';

import { useI18n } from '@renderer/context/I18nContext';
import { ButtonBack } from '@renderer/components/ui';
import Paths from '@renderer/routes/paths';
import { ChainId } from '@renderer/domain/shared-kernel';
import { useNetworkContext } from '@renderer/context/NetworkContext';
// TODO: extract chain loader component
import { InitOperation, Confirmation, Scanning, Signing, Submit, ChainLoader } from './components';
import { useChains } from '@renderer/services/network/chainsService';
import { Transaction } from '@renderer/domain/transaction';

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
  const [_, setTransaction] = useState<Transaction>();
  const [chainName, setChainName] = useState('...');

  const { chainId, assetId } = params;

  if (!chainId || !assetId) {
    return <Navigate replace to={Paths.BALANCES} />;
  }

  useEffect(() => {
    getChainById(chainId).then((chain) => setChainName(chain?.name || ''));
  }, []);

  const { api, assets, addressPrefix } = connections[chainId];

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

  const onInitResult = (transaction: Transaction) => {
    setTransaction(transaction);
    setActiveStep(Steps.CONFIRMATION);
  };

  const onConfirmResult = () => {
    setActiveStep(Steps.SCANNING);
  };

  const onScanResult = () => {
    setActiveStep(Steps.SIGNING);
  };

  const onBackToScan = () => {
    setActiveStep(Steps.SCANNING);
  };

  const onSignResult = () => {
    setActiveStep(Steps.SUBMIT);
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex items-center gap-x-2.5 mt-5 px-5">
        <ButtonBack onCustomReturn={goToPrevStep}>
          <p className="font-semibold text-2xl text-neutral-variant">{t('balances.title')}</p>
          <p className="font-semibold text-2xl text-neutral">/</p>
          <h1 className="font-semibold text-2xl text-neutral">{t('transfer.title')}</h1>
        </ButtonBack>
      </div>

      {activeStep === Steps.INIT && (
        <InitOperation
          api={api}
          chainId={chainId}
          asset={assets[0]}
          network={chainName}
          addressPrefix={addressPrefix}
          onResult={onInitResult}
        />
      )}
      {activeStep === Steps.CONFIRMATION && <Confirmation api={api} onResult={onConfirmResult} />}
      {activeStep === Steps.SCANNING && <Scanning api={api} onResult={onScanResult} />}
      {activeStep === Steps.SIGNING && <Signing api={api} onResult={onSignResult} onGoBack={onBackToScan} />}
      {activeStep === Steps.SUBMIT && <Submit api={api} />}
    </div>
  );
};

export default Transfer;

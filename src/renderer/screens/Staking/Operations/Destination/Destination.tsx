import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import noop from 'lodash/noop';
import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { formatAddress } from '@renderer/shared/utils/address';
import { RewardsDestination } from '@renderer/domain/stake';
import { ButtonBack, ButtonLink, Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { useChains } from '@renderer/services/network/chainsService';
import { StakingType } from '@renderer/domain/asset';
import { AccountID, ChainId, HexString } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { Confirmation, Scanning, Signing, Submit, ChainLoader } from '../components';
import Paths from '@renderer/routes/paths';
import { AccountDS } from '@renderer/services/storage';
import InitOperation, { DestinationResult } from './InitOperation/InitOperation';
import { useCountdown } from '../hooks/useCountdown';

const enum Steps {
  INIT,
  CONFIRMATION,
  SCANNING,
  SIGNING,
  SUBMIT,
}

type DestinationType = {
  address?: AccountID;
  type: RewardsDestination;
};

const HeaderTitles: Record<Steps, string> = {
  [Steps.INIT]: 'staking.destination.initDestinationSubtitle',
  [Steps.CONFIRMATION]: 'staking.bond.confirmBondSubtitle',
  [Steps.SCANNING]: 'staking.bond.scanSubtitle',
  [Steps.SIGNING]: 'staking.bond.signSubtitle',
  [Steps.SUBMIT]: 'staking.bond.submitSubtitle',
};

const Destination = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { connections } = useNetworkContext();
  const [searchParams] = useSearchParams();
  const { getChainById } = useChains();
  const params = useParams<{ chainId: ChainId }>();

  const [activeStep, setActiveStep] = useState<Steps>(Steps.INIT);
  const [chainName, setChainName] = useState('...');
  const [accounts, setAccounts] = useState<AccountDS[]>([]);
  const [destination, setDestination] = useState<DestinationType>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [unsignedTransactions, setUnsignedTransactions] = useState<UnsignedTransaction[]>([]);
  const [signatures, setSignatures] = useState<HexString[]>([]);

  const chainId = params.chainId || ('' as ChainId);
  const accountIds = searchParams.get('id')?.split(',') || [];

  if (!chainId || accountIds.length === 0) {
    return <Navigate replace to={Paths.STAKING} />;
  }

  const { api, explorers, addressPrefix, assets, name } = connections[chainId];
  const asset = assets.find((asset) => asset.staking === StakingType.RELAYCHAIN);

  useEffect(() => {
    getChainById(chainId).then((chain) => setChainName(chain?.name || ''));
  }, []);

  if (!api?.isConnected) {
    return <ChainLoader chainName={chainName} />;
  }

  const [countdown, resetCountdown] = useCountdown(api);

  const goToPrevStep = () => {
    if (activeStep === Steps.INIT) {
      navigate(Paths.STAKING);
    } else {
      // TODO: reset data
      setActiveStep((prev) => prev - 1);
    }
  };

  const headerContent = (
    <div className="flex items-center gap-x-2.5 mb-9 mt-5 px-5">
      <ButtonBack onCustomReturn={goToPrevStep} />
      <p className="font-semibold text-2xl text-neutral-variant">{t('staking.title')}</p>
      <p className="font-semibold text-2xl text-neutral">/</p>
      <h1 className="font-semibold text-2xl text-neutral">{t(HeaderTitles[activeStep])}</h1>
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
            {t('staking.bond.noStakingAssetDescription', { chainName: name })}
          </p>
          <ButtonLink className="mt-5" to={Paths.STAKING} variant="fill" pallet="primary" weight="lg">
            {t('staking.bond.goToStakingButton')}
          </ButtonLink>
        </div>
      </div>
    );
  }

  const onDestinationResult = ({ accounts, destination }: DestinationResult) => {
    const destPayload = destination
      ? { type: RewardsDestination.TRANSFERABLE, address: destination }
      : { type: RewardsDestination.RESTAKE };

    const transactions = accounts.map(({ accountId = '' }) => ({
      chainId,
      address: formatAddress(accountId, addressPrefix),
      type: TransactionType.DESTINATION,
      args: { payee: destination ? { Account: destination } : 'Staked' },
    }));

    setTransactions(transactions);
    setAccounts(accounts);
    setDestination(destPayload);
    setActiveStep(Steps.CONFIRMATION);
  };

  const onScanResult = (unsigned: UnsignedTransaction[]) => {
    setUnsignedTransactions(unsigned);
    setActiveStep(Steps.SIGNING);
  };

  const onBackToScan = () => {
    setActiveStep(Steps.SCANNING);
  };

  const onSignResult = (signatures: HexString[]) => {
    setSignatures(signatures);
    setActiveStep(Steps.SUBMIT);
  };

  return (
    <div className="flex flex-col h-full relative">
      {headerContent}

      {activeStep === Steps.INIT && (
        <InitOperation
          api={api}
          chainId={chainId}
          accountIds={accountIds}
          asset={asset}
          onResult={onDestinationResult}
        />
      )}
      {activeStep === Steps.CONFIRMATION && (
        <Confirmation
          title={t('staking.confirmation.rewardDestinationTitle')}
          api={api}
          accounts={accounts}
          destination={destination}
          transaction={transactions[0]}
          asset={asset}
          explorers={explorers}
          addressPrefix={addressPrefix}
          onResult={() => setActiveStep(Steps.SCANNING)}
          onAddToQueue={noop}
        />
      )}
      {activeStep === Steps.SCANNING && (
        <Scanning
          api={api}
          chainId={chainId}
          accounts={accounts}
          transactions={transactions}
          addressPrefix={addressPrefix}
          countdown={countdown}
          onResetCountdown={resetCountdown}
          onResult={onScanResult}
        />
      )}
      {activeStep === Steps.SIGNING && (
        <Signing
          countdown={countdown}
          multiQr={transactions.length > 1}
          onResult={onSignResult}
          onGoBack={onBackToScan}
        />
      )}
      {activeStep === Steps.SUBMIT && (
        <Submit
          title={t('staking.confirmation.rewardDestinationTitle')}
          api={api}
          transaction={transactions[0]}
          signatures={signatures}
          unsignedTx={unsignedTransactions}
          accounts={accounts}
          destination={destination}
          asset={asset}
          explorers={explorers}
          addressPrefix={addressPrefix}
        />
      )}
    </div>
  );
};

export default Destination;

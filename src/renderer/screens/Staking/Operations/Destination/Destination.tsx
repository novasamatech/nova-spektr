import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import noop from 'lodash/noop';
import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BN, BN_THOUSAND } from '@polkadot/util';

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
import { DEFAULT_QR_LIFETIME } from '@renderer/shared/utils/constants';

const enum Step {
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

const HEADER_TITLE: Record<Step, string> = {
  [Step.INIT]: 'staking.destination.initDestinationSubtitle',
  [Step.CONFIRMATION]: 'staking.bond.confirmBondSubtitle',
  [Step.SCANNING]: 'staking.bond.scanSubtitle',
  [Step.SIGNING]: 'staking.bond.signSubtitle',
  [Step.SUBMIT]: 'staking.bond.submitSubtitle',
};

const Destination = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { connections } = useNetworkContext();
  const [searchParams] = useSearchParams();
  const { getChainById, getExpectedBlockTime } = useChains();
  const params = useParams<{ chainId: ChainId }>();

  const [activeStep, setActiveStep] = useState<Step>(Step.INIT);
  const [chainName, setChainName] = useState('...');
  const [accounts, setAccounts] = useState<AccountDS[]>([]);
  const [destination, setDestination] = useState<DestinationType>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [unsignedTransactions, setUnsignedTransactions] = useState<UnsignedTransaction[]>([]);
  const [signatures, setSignatures] = useState<HexString[]>([]);
  const [countdown, setCountdown] = useState(DEFAULT_QR_LIFETIME);

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

  const resetCountdown = () => {
    const expectedBlockTime = getExpectedBlockTime(api);

    setCountdown(expectedBlockTime.mul(new BN(DEFAULT_QR_LIFETIME)).div(BN_THOUSAND).toNumber() || 0);
  };

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [countdown]);

  const goToPrevStep = () => {
    if (activeStep === Step.INIT) {
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
      <h1 className="font-semibold text-2xl text-neutral">{t(HEADER_TITLE[activeStep])}</h1>
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
    setActiveStep(Step.CONFIRMATION);
  };

  const onScanResult = (unsigned: UnsignedTransaction[]) => {
    setUnsignedTransactions(unsigned);
    setActiveStep(Step.SIGNING);
  };

  const onBackToScan = () => {
    setActiveStep(Step.SCANNING);
  };

  const onSignResult = (signatures: HexString[]) => {
    setSignatures(signatures);
    setActiveStep(Step.SUBMIT);
  };

  return (
    <div className="flex flex-col h-full relative">
      {headerContent}

      {activeStep === Step.INIT && (
        <InitOperation
          api={api}
          chainId={chainId}
          accountIds={accountIds}
          asset={asset}
          onResult={onDestinationResult}
        />
      )}
      {activeStep === Step.CONFIRMATION && (
        <Confirmation
          title={t('staking.confirmation.rewardDestinationTitle')}
          api={api}
          accounts={accounts}
          destination={destination}
          transaction={transactions[0]}
          asset={asset}
          explorers={explorers}
          addressPrefix={addressPrefix}
          onResult={() => setActiveStep(Step.SCANNING)}
          onAddToQueue={noop}
        />
      )}
      {activeStep === Step.SCANNING && (
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
      {activeStep === Step.SIGNING && (
        <Signing
          countdown={countdown}
          multiQr={transactions.length > 1}
          onResult={onSignResult}
          onGoBack={onBackToScan}
        />
      )}
      {activeStep === Step.SUBMIT && (
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

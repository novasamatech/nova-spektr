import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { ButtonBack, ButtonLink, Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { StakingType } from '@renderer/domain/asset';
import { AccountID, ChainId, SigningType } from '@renderer/domain/shared-kernel';
import { Transaction } from '@renderer/domain/transaction';
import Paths from '@renderer/routes/paths';
import { useAccount } from '@renderer/services/account/accountService';
import { StakingMap } from '@renderer/services/staking/common/types';
import { useStakingData } from '@renderer/services/staking/stakingDataService';
import { AccountDS } from '@renderer/services/storage';
import Scanning from '../components/Scanning/Scanning';
import Signing from '../components/Signing/Signing';
import Confirmation from './Confirmation/Confirmation';
import InitOperation, { UnstakeResult } from './InitOperation/InitOperation';

const enum Step {
  INIT,
  CONFIRMATION,
  SCANNING,
  SIGNING,
}

const HEADER_TITLE: Record<Step, string> = {
  [Step.INIT]: 'staking.unstake.initUnstakeSubtitle',
  [Step.CONFIRMATION]: 'staking.unstake.confirmUnstakeSubtitle',
  [Step.SCANNING]: 'staking.bond.scanSubtitle',
  [Step.SIGNING]: 'staking.bond.signSubtitle',
};

const Unstake = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { connections } = useNetworkContext();
  const { subscribeStaking } = useStakingData();
  const { getLiveAccounts } = useAccount();
  const accounts = getLiveAccounts({ signingType: SigningType.PARITY_SIGNER });

  const [searchParams] = useSearchParams();
  const params = useParams<{ chainId: ChainId }>();

  const [activeStep, setActiveStep] = useState<Step>(Step.INIT);

  const [unstakeAmount, setUnstakeAmount] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [_, setUnsignedTransactions] = useState<UnsignedTransaction[]>([]);
  const [staking, setStaking] = useState<StakingMap>({});
  const [selectedAccounts, setSelectedAccounts] = useState<AccountDS[]>([]);

  const chainId = params.chainId || ('' as ChainId);
  const accountIds = searchParams.get('id')?.split(',') || [];

  if (!chainId || accountIds.length === 0) {
    return <Navigate replace to={Paths.STAKING} />;
  }

  const { api, explorers, addressPrefix, assets, name } = connections[chainId];
  const asset = assets.find((asset) => asset.staking === StakingType.RELAYCHAIN);

  useEffect(() => {
    if (!api?.isConnected || accountIds.length === 0) return;

    let unsubStaking: () => void | undefined;

    const selectedAccounts = accounts.reduce<AccountID[]>((acc, account) => {
      const accountExists = account.id && accountIds.includes(account.id.toString());

      return accountExists ? [...acc, account.accountId as AccountID] : acc;
    }, []);

    (async () => {
      unsubStaking = await subscribeStaking(chainId, api, selectedAccounts, setStaking);
    })();

    return () => {
      unsubStaking?.();
    };
  }, [api, accounts.length, accountIds.length]);

  if (!api?.isConnected) {
    // TODO: show skeleton until we connect to network's api
    return null;
  }

  const goToPrevStep = () => {
    if (activeStep === Step.INIT) {
      navigate(Paths.STAKING);
    } else {
      // TODO: reset data
      setActiveStep((prev) => prev - 1);
    }
  };

  const onUnstakeResult = (data: UnstakeResult) => {
    if (!asset) return;

    setSelectedAccounts(data.accounts);
    setUnstakeAmount(data.amount);
    setActiveStep(Step.CONFIRMATION);
  };

  const onConfirmResult = (transactions: Transaction[]) => {
    setTransactions(transactions);
    setActiveStep(Step.SCANNING);
  };

  const onScanResult = (unsigned: UnsignedTransaction[]) => {
    setUnsignedTransactions(unsigned);
    setActiveStep(Step.SIGNING);
  };

  const onSignResult = () => {
    navigate(Paths.STAKING, { replace: true });
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

  return (
    <div className="flex flex-col h-full relative">
      {headerContent}

      {activeStep === Step.INIT && (
        <InitOperation
          api={api}
          chainId={chainId}
          staking={staking}
          accountIds={accountIds}
          asset={asset}
          onResult={onUnstakeResult}
        />
      )}
      {activeStep === Step.CONFIRMATION && (
        <Confirmation
          api={api}
          chainId={chainId}
          accounts={selectedAccounts}
          unstake={unstakeAmount}
          asset={asset}
          explorers={explorers}
          addressPrefix={addressPrefix}
          onResult={onConfirmResult}
        />
      )}
      {activeStep === Step.SCANNING && (
        <Scanning
          api={api}
          chainId={chainId}
          accounts={selectedAccounts}
          transactions={transactions}
          addressPrefix={addressPrefix}
          onResult={onScanResult}
        />
      )}
      {activeStep === Step.SIGNING && (
        <Signing
          api={api}
          multiQr={transactions.length > 1}
          onResult={onSignResult}
          onGoBack={() => setActiveStep(Step.SCANNING)}
        />
      )}
      {/* TODO: add submit step */}
      {/*{activeStep === Step.SUBMIT && (*/}
      {/*  <Submit*/}
      {/*    api={api}*/}
      {/*    chainId={chainId}*/}
      {/*    signatures={signatures}*/}
      {/*    unsignedTransactions={unsignedTransactions}*/}
      {/*    validators={Object.values(validators)}*/}
      {/*    accounts={accounts}*/}
      {/*    stake={stakeAmount}*/}
      {/*    destination={destination}*/}
      {/*    asset={asset}*/}
      {/*    explorers={explorers}*/}
      {/*    addressPrefix={addressPrefix}*/}
      {/*  />*/}
      {/*)}*/}
    </div>
  );
};

export default Unstake;

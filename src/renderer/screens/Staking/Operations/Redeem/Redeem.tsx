import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { ButtonBack, ButtonLink, Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { StakingType } from '@renderer/domain/asset';
import { AccountID, ChainId, HexString, SigningType } from '@renderer/domain/shared-kernel';
import { Transaction } from '@renderer/domain/transaction';
import Paths from '@renderer/routes/paths';
import { useAccount } from '@renderer/services/account/accountService';
import { StakingMap } from '@renderer/services/staking/common/types';
import { useStakingData } from '@renderer/services/staking/stakingDataService';
import Scanning from '../components/Scanning/Scanning';
import Signing from '../components/Signing/Signing';
import Confirmation from './Confirmation/Confirmation';
import Submit from './Submit/Submit';
import { redeemableAmount } from '@renderer/services/balance/common/utils';
import { useEra } from '@renderer/services/staking/eraService';
import { AccountWithAmount } from './types';

const enum Step {
  CONFIRMATION,
  SCANNING,
  SIGNING,
  SUBMIT,
}

const HEADER_TITLE: Record<Step, string> = {
  [Step.CONFIRMATION]: 'staking.redeem.initRedeemSubtitle',
  [Step.SCANNING]: 'staking.bond.scanSubtitle',
  [Step.SIGNING]: 'staking.bond.signSubtitle',
  [Step.SUBMIT]: 'staking.bond.submitSubtitle',
};

const Unstake = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { connections } = useNetworkContext();
  const { subscribeStaking } = useStakingData();
  const { getLiveAccounts } = useAccount();
  const dbAccounts = getLiveAccounts({ signingType: SigningType.PARITY_SIGNER });
  const { subscribeActiveEra } = useEra();

  const [searchParams] = useSearchParams();
  const params = useParams<{ chainId: ChainId }>();

  const [activeStep, setActiveStep] = useState<Step>(Step.CONFIRMATION);

  const [era, setEra] = useState<number>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [unsignedTransactions, setUnsignedTransactions] = useState<UnsignedTransaction[]>([]);
  const [staking, setStaking] = useState<StakingMap>({});
  const [selectedAccounts, setSelectedAccounts] = useState<AccountWithAmount[]>([]);
  const [finalAccounts, setFinalAccounts] = useState<AccountWithAmount[]>([]);
  const [signatures, setSignatures] = useState<HexString[]>([]);

  const chainId = params.chainId || ('' as ChainId);
  const accountIds = searchParams.get('id')?.split(',') || [];

  if (!chainId || accountIds.length === 0) {
    return <Navigate replace to={Paths.STAKING} />;
  }

  const { api, explorers, addressPrefix, assets, name } = connections[chainId];
  const asset = assets.find((asset) => asset.staking === StakingType.RELAYCHAIN);

  useEffect(() => {
    const selectedAccounts = dbAccounts.reduce<AccountWithAmount[]>((acc, account) => {
      const accountExists = account.id && accountIds.includes(account.id.toString());
      const stake = account.accountId && staking[account.accountId];
      const redeemable = stake && era && redeemableAmount(stake.unlocking, era);

      return accountExists ? [...acc, { ...account, amount: redeemable } as AccountWithAmount] : acc;
    }, []);

    setSelectedAccounts(selectedAccounts);
  }, [dbAccounts.length, staking]);

  useEffect(() => {
    if (!api?.isConnected || accountIds.length === 0) return;

    let unsubEra: () => void | undefined;
    let unsubStaking: () => void | undefined;

    (async () => {
      unsubEra = await subscribeActiveEra(api, setEra);
      unsubStaking = await subscribeStaking(
        chainId,
        api,
        selectedAccounts.map((a) => a.accountId) as AccountID[],
        setStaking,
      );
    })();

    return () => {
      unsubEra?.();
      unsubStaking?.();
    };
  }, [api, selectedAccounts.length, accountIds.length]);

  if (!api?.isConnected) {
    // TODO: show skeleton until we connect to network's api
    return null;
  }

  const goToPrevStep = () => {
    if (activeStep === Step.CONFIRMATION) {
      navigate(Paths.STAKING);
    } else {
      // TODO: reset data
      setActiveStep((prev) => prev - 1);
    }
  };

  const onConfirmResult = (transactions: Transaction[]) => {
    setTransactions(transactions);
    setActiveStep(Step.SCANNING);
  };

  const onScanResult = (unsigned: UnsignedTransaction[]) => {
    setUnsignedTransactions(unsigned);
    setActiveStep(Step.SIGNING);
  };

  const onSignResult = (signatures: HexString[]) => {
    setSignatures(signatures);
    setFinalAccounts(selectedAccounts);
    setActiveStep(Step.SUBMIT);
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

      {activeStep === Step.CONFIRMATION && (
        <Confirmation
          api={api}
          chainId={chainId}
          accounts={selectedAccounts}
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
      {activeStep === Step.SUBMIT && (
        <Submit
          api={api}
          transactions={transactions}
          signatures={signatures}
          unsignedTransactions={unsignedTransactions}
          accounts={finalAccounts}
          asset={asset}
          explorers={explorers}
          addressPrefix={addressPrefix}
        />
      )}
    </div>
  );
};

export default Unstake;

import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import noop from 'lodash/noop';
import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { ButtonBack, ButtonLink, HintList, Icon } from '@renderer/components/ui';
import { ChainLoader } from '@renderer/components/common';
import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { useChains } from '@renderer/services/network/chainsService';
import { ChainId, HexString } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import Paths from '@renderer/routes/paths';
import { AccountDS } from '@renderer/services/storage';
import InitOperation, { StakeMoreResult } from './InitOperation/InitOperation';
import { Confirmation, Scanning, Signing, Submit } from '../components';
import { useCountdown } from '../hooks/useCountdown';
import { getRelaychainAsset } from '@renderer/shared/utils/address';

const enum Steps {
  INIT,
  CONFIRMATION,
  SCANNING,
  SIGNING,
  SUBMIT,
}

const HeaderTitles: Record<Steps, string> = {
  [Steps.INIT]: 'staking.stakeMore.initStakeMoreSubtitle',
  [Steps.CONFIRMATION]: 'staking.stakeMore.confirmStakeMoreSubtitle',
  [Steps.SCANNING]: 'staking.bond.scanSubtitle',
  [Steps.SIGNING]: 'staking.bond.signSubtitle',
  [Steps.SUBMIT]: 'staking.bond.submitSubtitle',
};

const StakeMore = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { connections } = useNetworkContext();
  const { getChainById } = useChains();
  const [searchParams] = useSearchParams();
  const params = useParams<{ chainId: ChainId }>();

  const [activeStep, setActiveStep] = useState<Steps>(Steps.INIT);
  const [chainName, setChainName] = useState('...');
  const [stakeMoreAmount, setStakeMoreAmount] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [unsignedTransactions, setUnsignedTransactions] = useState<UnsignedTransaction[]>([]);
  const [accounts, setAccounts] = useState<AccountDS[]>([]);
  const [signatures, setSignatures] = useState<HexString[]>([]);

  const chainId = params.chainId || ('' as ChainId);
  const accountIds = searchParams.get('id')?.split(',') || [];

  if (!chainId || accountIds.length === 0) {
    return <Navigate replace to={Paths.STAKING} />;
  }

  const { api, explorers, addressPrefix, assets, name } = connections[chainId];
  const asset = getRelaychainAsset(assets);

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
      <ButtonBack onCustomReturn={goToPrevStep}>
        <p className="font-semibold text-2xl text-neutral-variant">{t('staking.title')}</p>
        <p className="font-semibold text-2xl text-neutral">/</p>
        <h1 className="font-semibold text-2xl text-neutral">{t(HeaderTitles[activeStep])}</h1>
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
            {t('staking.bond.noStakingAssetDescription', { chainName: name })}
          </p>
          <ButtonLink className="mt-5" to={Paths.STAKING} variant="fill" pallet="primary" weight="lg">
            {t('staking.bond.goToStakingButton')}
          </ButtonLink>
        </div>
      </div>
    );
  }

  const onStakeMoreResult = ({ accounts, amount }: StakeMoreResult) => {
    const transactions = accounts.map(({ accountId = '' }) => ({
      chainId,
      address: accountId,
      type: TransactionType.STAKE_MORE,
      args: { maxAdditional: amount },
    }));

    setTransactions(transactions);
    setAccounts(accounts);
    setStakeMoreAmount(amount);
    setActiveStep(Steps.CONFIRMATION);
  };

  const onScanResult = (unsigned: UnsignedTransaction[]) => {
    setUnsignedTransactions(unsigned);
    setActiveStep(Steps.SIGNING);
  };

  const onSignResult = (signatures: HexString[]) => {
    setSignatures(signatures);
    setActiveStep(Steps.SUBMIT);
  };

  const explorersProps = { explorers, addressPrefix, asset };
  const stakeMoreValues = new Array(accounts.length).fill(stakeMoreAmount);

  const hints = (
    <HintList className="px-[15px]">
      <HintList.Item>{t('staking.stakeMore.eraHint')}</HintList.Item>
    </HintList>
  );

  return (
    <div className="flex flex-col h-full relative">
      {headerContent}

      {activeStep === Steps.INIT && (
        <InitOperation api={api} chainId={chainId} accountIds={accountIds} asset={asset} onResult={onStakeMoreResult} />
      )}
      {activeStep === Steps.CONFIRMATION && (
        <Confirmation
          api={api}
          accounts={accounts}
          transaction={transactions[0]}
          amounts={stakeMoreValues}
          onResult={() => setActiveStep(Steps.SCANNING)}
          onAddToQueue={noop}
          {...explorersProps}
        >
          {hints}
        </Confirmation>
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
          onGoBack={() => setActiveStep(Steps.SCANNING)}
        />
      )}
      {activeStep === Steps.SUBMIT && (
        <Submit
          api={api}
          transaction={transactions[0]}
          signatures={signatures}
          unsignedTx={unsignedTransactions}
          accounts={accounts}
          amounts={stakeMoreValues}
          {...explorersProps}
        >
          {hints}
        </Submit>
      )}
    </div>
  );
};

export default StakeMore;

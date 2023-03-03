import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import noop from 'lodash/noop';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BN } from '@polkadot/util';

import { UnstakingDuration } from '@renderer/screens/Staking/Overview/components';
import { ButtonBack, ButtonLink, HintList, Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { StakingType } from '@renderer/domain/asset';
import { AccountID, ChainId, HexString, SigningType } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import Paths from '@renderer/routes/paths';
import { useAccount } from '@renderer/services/account/accountService';
import { useChains } from '@renderer/services/network/chainsService';
import { StakingMap } from '@renderer/services/staking/common/types';
import { useStakingData } from '@renderer/services/staking/stakingDataService';
import { AccountDS } from '@renderer/services/storage';
import InitOperation, { UnstakeResult } from './InitOperation/InitOperation';
import { Confirmation, Scanning, Signing, Submit, ChainLoader } from '../components';
import { formatAddress } from '@renderer/shared/utils/address';

const enum Step {
  INIT,
  CONFIRMATION,
  SCANNING,
  SIGNING,
  SUBMIT,
}

const HEADER_TITLE: Record<Step, string> = {
  [Step.INIT]: 'staking.unstake.initUnstakeSubtitle',
  [Step.CONFIRMATION]: 'staking.unstake.confirmUnstakeSubtitle',
  [Step.SCANNING]: 'staking.bond.scanSubtitle',
  [Step.SIGNING]: 'staking.bond.signSubtitle',
  [Step.SUBMIT]: 'staking.bond.signSubtitle',
};

const Unstake = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { connections } = useNetworkContext();
  const { getChainById } = useChains();
  const { subscribeStaking, getMinNominatorBond } = useStakingData();
  const { getLiveAccounts } = useAccount();
  const dbAccounts = getLiveAccounts({ signingType: SigningType.PARITY_SIGNER });

  const [searchParams] = useSearchParams();
  const params = useParams<{ chainId: ChainId }>();

  const [activeStep, setActiveStep] = useState<Step>(Step.INIT);
  const [chainName, setChainName] = useState('...');
  const [unstakeAmount, setUnstakeAmount] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [unsignedTransactions, setUnsignedTransactions] = useState<UnsignedTransaction[]>([]);
  const [staking, setStaking] = useState<StakingMap>({});
  const [accounts, setAccounts] = useState<AccountDS[]>([]);
  const [signatures, setSignatures] = useState<HexString[]>([]);
  const [minimumStake, setMinimumStake] = useState('0');

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

    const selectedAccounts = dbAccounts.reduce<AccountID[]>((acc, account) => {
      const accountExists = account.id && accountIds.includes(account.id.toString());

      return accountExists ? [...acc, account.accountId as AccountID] : acc;
    }, []);

    (async () => {
      unsubStaking = await subscribeStaking(chainId, api, selectedAccounts, setStaking);
    })();

    return () => {
      unsubStaking?.();
    };
  }, [api, dbAccounts.length, accountIds.length]);

  useEffect(() => {
    if (!api) return;

    getMinNominatorBond(api).then(setMinimumStake);
  }, [api]);

  useEffect(() => {
    getChainById(chainId).then((chain) => setChainName(chain?.name || ''));
  }, []);

  if (!api?.isConnected) {
    return <ChainLoader chainName={chainName} />;
  }

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

  const onUnstakeResult = ({ accounts, amount }: UnstakeResult) => {
    const transactions = accounts.map(({ accountId = '' }) => {
      const address = formatAddress(accountId, addressPrefix);
      const commonPayload = { chainId, address };

      const unstakeTx = {
        ...commonPayload,
        type: TransactionType.UNSTAKE,
        args: { value: amount },
      };

      const leftAmount = new BN(staking[accountId]?.active || 0).sub(new BN(amount));

      if (leftAmount.gt(new BN(minimumStake))) return unstakeTx;

      const chillTx = {
        ...commonPayload,
        type: TransactionType.CHILL,
        args: {},
      };

      return {
        ...commonPayload,
        type: TransactionType.BATCH_ALL,
        args: { transactions: [chillTx, unstakeTx] },
      };
    });

    setTransactions(transactions);
    setAccounts(accounts);
    setUnstakeAmount(amount);
    setActiveStep(Step.CONFIRMATION);
  };

  const onScanResult = (unsigned: UnsignedTransaction[]) => {
    setUnsignedTransactions(unsigned);
    setActiveStep(Step.SIGNING);
  };

  const onSignResult = (signatures: HexString[]) => {
    setSignatures(signatures);
    setActiveStep(Step.SUBMIT);
  };

  const explorersProps = { explorers, addressPrefix, asset };
  const unstakeValues = new Array(accounts.length).fill(unstakeAmount);

  const hints = (
    <HintList className="px-[15px]">
      <HintList.Item>
        {t('staking.unstake.durationHint')} {'('}
        <UnstakingDuration className="ml-1" api={api} />
        {')'}
      </HintList.Item>
      <HintList.Item>{t('staking.unstake.noRewardsHint')}</HintList.Item>
      <HintList.Item>{t('staking.unstake.redeemHint')}</HintList.Item>
    </HintList>
  );

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
          accounts={accounts}
          transaction={transactions[0]}
          amounts={unstakeValues}
          onResult={() => setActiveStep(Step.SCANNING)}
          onAddToQueue={noop}
          {...explorersProps}
        >
          {hints}
        </Confirmation>
      )}
      {activeStep === Step.SCANNING && (
        <Scanning
          api={api}
          chainId={chainId}
          accounts={accounts}
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
          transaction={transactions[0]}
          signatures={signatures}
          unsignedTx={unsignedTransactions}
          accounts={accounts}
          amounts={unstakeValues}
          {...explorersProps}
        >
          {hints}
        </Submit>
      )}
    </div>
  );
};

export default Unstake;

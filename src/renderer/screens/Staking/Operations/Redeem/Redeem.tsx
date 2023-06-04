import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import Paths from '@renderer/routes/paths';
import { ButtonBack, ButtonLink, Icon } from '@renderer/components/ui';
import { ChainLoader } from '@renderer/components/common';
import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { ChainId, HexString, AccountId, Address } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { useAccount } from '@renderer/services/account/accountService';
import { StakingMap } from '@renderer/services/staking/common/types';
import { useStakingData } from '@renderer/services/staking/stakingDataService';
import { useChains } from '@renderer/services/network/chainsService';
import { useEra } from '@renderer/services/staking/eraService';
import InitOperation, { RedeemResult } from './InitOperation/InitOperation';
import { Confirmation, MultiScanning, Signing, Submit, SingleScanning } from '../components';
import { getRelaychainAsset } from '@renderer/shared/utils/assets';
import { useCountdown, useToggle } from '@renderer/shared/hooks';
import { Account, MultisigAccount, isMultisig } from '@renderer/domain/account';
import { toAddress } from '@renderer/shared/utils/address';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { DEFAULT_TRANSITION } from '@renderer/shared/utils/constants';

const enum Step {
  INIT,
  CONFIRMATION,
  SCANNING,
  SIGNING,
  SUBMIT,
}

const HeaderTitles: Record<Step, string> = {
  [Step.INIT]: 'staking.redeem.initRedeemSubtitle',
  [Step.CONFIRMATION]: 'staking.redeem.confirmRedeemSubtitle',
  [Step.SCANNING]: 'staking.bond.scanSubtitle',
  [Step.SIGNING]: 'staking.bond.signSubtitle',
  [Step.SUBMIT]: 'staking.bond.submitSubtitle',
};

const Unstake = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { getTransactionHash } = useTransaction();
  const { connections } = useNetworkContext();
  const { subscribeStaking } = useStakingData();
  const { getLiveAccounts } = useAccount();
  const { subscribeActiveEra } = useEra();
  const { getChainById } = useChains();
  const [searchParams] = useSearchParams();
  const params = useParams<{ chainId: ChainId }>();

  const dbAccounts = getLiveAccounts();

  const [_, toggleRedeemModal] = useToggle(true);

  const [activeStep, setActiveStep] = useState<Step>(Step.INIT);
  const [chainName, setChainName] = useState('...');
  const [redeemAmounts, setRedeemAmounts] = useState<string[]>([]);
  const [description, setDescription] = useState('');

  const [era, setEra] = useState<number>();
  const [staking, setStaking] = useState<StakingMap>({});
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [signer, setSigner] = useState<Account>();

  const [multisigTx, setMultisigTx] = useState<Transaction>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [unsignedTransactions, setUnsignedTransactions] = useState<UnsignedTransaction[]>([]);

  const [signatures, setSignatures] = useState<HexString[]>([]);

  const chainId = params.chainId || ('' as ChainId);
  const accountIds = searchParams.get('id')?.split(',') || [];

  if (!chainId || accountIds.length === 0) {
    return <Navigate replace to={Paths.STAKING} />;
  }

  const { api, explorers, addressPrefix, assets, name } = connections[chainId];
  const asset = getRelaychainAsset(assets);

  const [countdown, resetCountdown] = useCountdown(api);

  useEffect(() => {
    const selectedAccounts = dbAccounts.reduce<Account[]>((acc, account) => {
      const accountExists = account.id && accountIds.includes(account.id.toString());
      if (accountExists) {
        acc.push(account);
      }

      return acc;
    }, []);

    setAccounts(selectedAccounts);
  }, [dbAccounts.length]);

  useEffect(() => {
    if (!api?.isConnected || accounts.length === 0) return;

    let unsubEra: () => void | undefined;
    let unsubStaking: () => void | undefined;

    (async () => {
      const addresses = accounts.map((a) => toAddress(a.accountId, { prefix: addressPrefix }));
      unsubEra = await subscribeActiveEra(api, setEra);
      unsubStaking = await subscribeStaking(chainId, api, addresses, setStaking);
    })();

    return () => {
      unsubEra?.();
      unsubStaking?.();
    };
  }, [api, accounts.length]);

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

  const closeRedeemModal = () => {
    toggleRedeemModal();
    setTimeout(() => navigate(Paths.STAKING), DEFAULT_TRANSITION);
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

  const getRedeemTxs = (accounts: Account[]): Transaction[] => {
    return accounts.map(({ accountId }) => ({
      chainId,
      address: toAddress(accountId, { prefix: addressPrefix }),
      type: TransactionType.REDEEM,
      args: { numSlashingSpans: 1 },
    }));
  };

  const getMultisigTx = (
    account: MultisigAccount,
    signerAccountId: AccountId,
    transaction: Transaction,
  ): Transaction => {
    const { callData, callHash } = getTransactionHash(transaction, api);

    const otherSignatories = account.signatories.reduce<Address[]>((acc, s) => {
      if (s.accountId !== signerAccountId) {
        acc.push(toAddress(s.accountId, { prefix: addressPrefix }));
      }

      return acc;
    }, []);

    return {
      chainId,
      address: toAddress(signerAccountId, { prefix: addressPrefix }),
      type: TransactionType.MULTISIG_AS_MULTI,
      args: {
        threshold: account.threshold,
        otherSignatories: otherSignatories.sort(),
        maybeTimepoint: null,
        callData,
        callHash,
      },
    };
  };

  const onRedeemResult = ({ accounts, signer, amounts, description }: RedeemResult) => {
    const transactions = getRedeemTxs(accounts);

    if (signer && isMultisig(accounts[0])) {
      const multisigTx = getMultisigTx(accounts[0], signer.accountId, transactions[0]);
      setMultisigTx(multisigTx);
      setSigner(signer);
      setDescription(description || '');
    }

    setTransactions(transactions);
    setAccounts(accounts);
    setRedeemAmounts(amounts);
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

  return (
    <div className="flex flex-col h-full relative">
      {headerContent}
      {activeStep === Step.INIT && (
        <InitOperation
          api={api}
          chainId={chainId}
          identifiers={accountIds}
          era={era}
          staking={staking}
          onResult={onRedeemResult}
          {...explorersProps}
        />
      )}
      {activeStep === Step.CONFIRMATION && (
        <Confirmation
          api={api}
          accounts={accounts}
          amounts={redeemAmounts}
          transaction={transactions[0]}
          multisigTx={multisigTx}
          onResult={() => setActiveStep(Step.SCANNING)}
          onGoBack={goToPrevStep}
          {...explorersProps}
        />
      )}
      {activeStep === Step.SCANNING &&
        (transactions.length > 1 ? (
          <MultiScanning
            api={api}
            addressPrefix={addressPrefix}
            countdown={countdown}
            accounts={accounts}
            transactions={transactions}
            chainId={chainId}
            onResetCountdown={resetCountdown}
            onResult={onScanResult}
          />
        ) : (
          <SingleScanning
            api={api}
            addressPrefix={addressPrefix}
            countdown={countdown}
            account={signer || accounts[0]}
            transaction={multisigTx || transactions[0]}
            chainId={chainId}
            onResetCountdown={resetCountdown}
            onResult={(unsignedTx) => onScanResult([unsignedTx])}
          />
        ))}
      {activeStep === Step.SIGNING && (
        <Signing
          countdown={countdown}
          multiQr={transactions.length > 1}
          onResult={onSignResult}
          onGoBack={() => setActiveStep(Step.SCANNING)}
        />
      )}
      {activeStep === Step.SUBMIT && (
        <Submit
          api={api}
          txs={transactions}
          multisigTx={multisigTx}
          description={description}
          signatures={signatures}
          unsignedTx={unsignedTransactions}
          accounts={accounts}
          successMessage={t('staking.redeem.submitSuccess')}
          onClose={closeRedeemModal}
          {...explorersProps}
        />
      )}
    </div>
  );
};

export default Unstake;

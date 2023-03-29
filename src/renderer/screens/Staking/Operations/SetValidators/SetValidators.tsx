import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import noop from 'lodash/noop';
import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { ButtonBack, ButtonLink, HintList, Icon } from '@renderer/components/ui';
import { ChainLoader } from '@renderer/components/common';
import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { useChains } from '@renderer/services/network/chainsService';
import { ChainId, HexString, SigningType } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import Paths from '@renderer/routes/paths';
import { useAccount } from '@renderer/services/account/accountService';
import { ValidatorMap } from '@renderer/services/staking/common/types';
import { formatAddress } from '@renderer/shared/utils/address';
import { getRelaychainAsset } from '@renderer/shared/utils/assets';
import { Confirmation, Scanning, Signing, Submit, Validators } from '../components';
import { useCountdown } from '../hooks/useCountdown';

const enum Steps {
  INIT,
  CONFIRMATION,
  SCANNING,
  SIGNING,
  SUBMIT,
}

const HeaderTitles: Record<Steps, string> = {
  [Steps.INIT]: 'staking.bond.validatorsSubtitle',
  [Steps.CONFIRMATION]: 'staking.bond.confirmBondSubtitle',
  [Steps.SCANNING]: 'staking.bond.scanSubtitle',
  [Steps.SIGNING]: 'staking.bond.signSubtitle',
  [Steps.SUBMIT]: 'staking.bond.submitSubtitle',
};

const SetValidators = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { getLiveAccounts } = useAccount();
  const { getChainById } = useChains();
  const { connections } = useNetworkContext();
  const [searchParams] = useSearchParams();
  const params = useParams<{ chainId: ChainId }>();

  const dbAccounts = getLiveAccounts({ signingType: SigningType.PARITY_SIGNER });

  const [activeStep, setActiveStep] = useState<Steps>(Steps.INIT);
  const [chainName, setChainName] = useState('...');
  const [validators, setValidators] = useState<ValidatorMap>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [unsignedTransactions, setUnsignedTransactions] = useState<UnsignedTransaction[]>([]);
  const [signatures, setSignatures] = useState<HexString[]>([]);

  const chainId = params.chainId || ('' as ChainId);
  const accountIds = searchParams.get('id')?.split(',') || [];

  if (!chainId || accountIds.length === 0) {
    return <Navigate replace to={Paths.STAKING} />;
  }

  const totalAccounts = dbAccounts.filter((account) => {
    return account.id && accountIds.includes(account.id.toString());
  });

  const { api, explorers, addressPrefix, assets, name } = connections[chainId];
  const asset = getRelaychainAsset(assets);

  const [countdown, resetCountdown] = useCountdown(api);

  useEffect(() => {
    getChainById(chainId).then((chain) => setChainName(chain?.name || ''));
  }, []);

  if (!api?.isConnected) {
    return <ChainLoader chainName={chainName} />;
  }

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

  const onSelectValidators = (validators: ValidatorMap) => {
    const transactions = totalAccounts.map(({ accountId = '' }) => {
      return {
        chainId,
        address: formatAddress(accountId, addressPrefix),
        type: TransactionType.NOMINATE,
        args: { targets: Object.keys(validators).map((address) => address) },
      };
    });

    setTransactions(transactions);
    setValidators(validators);
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

  const explorersProps = { explorers, addressPrefix, asset };

  const hints = (
    <HintList className="px-[15px]">
      <HintList.Item>{t('staking.confirmation.hintNewValidators')}</HintList.Item>
    </HintList>
  );

  return (
    <div className="flex flex-col h-full relative">
      {headerContent}

      {activeStep === Steps.INIT && (
        <Validators
          api={api}
          chainId={chainId}
          asset={asset}
          explorers={explorers}
          addressPrefix={addressPrefix}
          onResult={onSelectValidators}
        />
      )}
      {activeStep === Steps.CONFIRMATION && (
        <Confirmation
          title={t('staking.confirmation.setValidatorsTitle')}
          api={api}
          validators={Object.values(validators)}
          transaction={transactions[0]}
          accounts={totalAccounts}
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
          accounts={totalAccounts}
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
          title={t('staking.confirmation.setValidatorsTitle')}
          api={api}
          transaction={transactions[0]}
          signatures={signatures}
          unsignedTx={unsignedTransactions}
          validators={Object.values(validators)}
          accounts={totalAccounts}
          {...explorersProps}
        >
          {hints}
        </Submit>
      )}
    </div>
  );
};

export default SetValidators;

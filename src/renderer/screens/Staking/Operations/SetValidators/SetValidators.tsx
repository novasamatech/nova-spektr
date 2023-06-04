import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { ButtonBack, ButtonLink, Icon } from '@renderer/components/ui';
import { ChainLoader } from '@renderer/components/common';
import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { useChains } from '@renderer/services/network/chainsService';
import { ChainId, HexString } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import Paths from '@renderer/routes/paths';
import { useAccount } from '@renderer/services/account/accountService';
import { ValidatorMap } from '@renderer/services/staking/common/types';
import { toAddress } from '@renderer/shared/utils/address';
import { getRelaychainAsset } from '@renderer/shared/utils/assets';
import { Confirmation, MultiScanning, Signing, Submit, Validators } from '../components';
import { useCountdown, useToggle } from '@renderer/shared/hooks';
import { getTotalAccounts } from '@renderer/screens/Staking/Operations/common/utils';
import { Alert } from '@renderer/components/ui-redesign';
import { DEFAULT_TRANSITION } from '@renderer/shared/utils/constants';

const enum Step {
  INIT,
  CONFIRMATION,
  SCANNING,
  SIGNING,
  SUBMIT,
}

const HeaderTitles: Record<Step, string> = {
  [Step.INIT]: 'staking.bond.validatorsSubtitle',
  [Step.CONFIRMATION]: 'staking.bond.confirmBondSubtitle',
  [Step.SCANNING]: 'staking.bond.scanSubtitle',
  [Step.SIGNING]: 'staking.bond.signSubtitle',
  [Step.SUBMIT]: 'staking.bond.submitSubtitle',
};

const SetValidators = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { getLiveAccounts } = useAccount();
  const { getChainById } = useChains();
  const { connections } = useNetworkContext();
  const [searchParams] = useSearchParams();
  const params = useParams<{ chainId: ChainId }>();

  const dbAccounts = getLiveAccounts();

  const [_, toggleValidatorsModal] = useToggle(true);
  const [isAlertOpen, toggleAlert] = useToggle(true);

  const [activeStep, setActiveStep] = useState<Step>(Step.INIT);
  const [chainName, setChainName] = useState('...');
  const [validators, setValidators] = useState<ValidatorMap>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [unsignedTransactions, setUnsignedTransactions] = useState<UnsignedTransaction[]>([]);
  const [signatures, setSignatures] = useState<HexString[]>([]);

  const chainId = params.chainId || ('' as ChainId);
  const identifiers = searchParams.get('id')?.split(',') || [];

  if (!chainId || identifiers.length === 0) {
    return <Navigate replace to={Paths.STAKING} />;
  }

  const totalAccounts = getTotalAccounts(dbAccounts, identifiers);

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
    if (activeStep === Step.INIT) {
      navigate(Paths.STAKING);
    } else {
      // TODO: reset data
      setActiveStep((prev) => prev - 1);
    }
  };

  const closeValidatorsModal = () => {
    toggleValidatorsModal();
    setTimeout(() => navigate(Paths.STAKING), DEFAULT_TRANSITION);
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
        address: toAddress(accountId, { prefix: addressPrefix }),
        type: TransactionType.NOMINATE,
        args: { targets: Object.keys(validators).map((address) => address) },
      };
    });

    setTransactions(transactions);
    setValidators(validators);
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

  const explorersProps = { explorers, addressPrefix, asset };

  return (
    <div className="flex flex-col h-full relative">
      {headerContent}

      {activeStep === Step.INIT && (
        <Validators
          api={api}
          chainId={chainId}
          asset={asset}
          explorers={explorers}
          addressPrefix={addressPrefix}
          onResult={onSelectValidators}
          onGoBack={console.log}
        />
      )}
      {activeStep === Step.CONFIRMATION && (
        <Confirmation
          api={api}
          validators={Object.values(validators)}
          transaction={transactions[0]}
          accounts={totalAccounts}
          onResult={() => setActiveStep(Step.SCANNING)}
          onGoBack={goToPrevStep}
          {...explorersProps}
        >
          {isAlertOpen && (
            <Alert title="YYYY" className="px-[15px]" onClose={toggleAlert}>
              <Alert.Item>{t('staking.confirmation.hintNewValidators')}</Alert.Item>
            </Alert>
          )}
        </Confirmation>
      )}
      {activeStep === Step.SCANNING && (
        <MultiScanning
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
          api={api}
          // transaction={transactions[0]}
          signatures={signatures}
          unsignedTx={unsignedTransactions}
          // validators={Object.values(validators)}
          accounts={totalAccounts}
          successMessage={t('staking.validators.submitSuccess')}
          onClose={closeValidatorsModal}
          {...explorersProps}
        />
      )}
    </div>
  );
};

export default SetValidators;

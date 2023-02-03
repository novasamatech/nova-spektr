import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ButtonBack } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { StakingType } from '@renderer/domain/asset';
import { ChainId } from '@renderer/domain/shared-kernel';
import Paths from '@renderer/routes/paths';
import ConfirmBond from '@renderer/screens/Staking/Bond/ConfirmBond/ConfirmBond';
import InitBond from '@renderer/screens/Staking/Bond/InitBond/InitBond';
import Validators from '@renderer/screens/Staking/Bond/Validators/Validators';
import { ValidatorMap } from '@renderer/services/staking/common/types';
import { useAccount } from '@renderer/services/account/accountService';

const enum Step {
  InitBond,
  Validators,
  ConfirmBond,
}

const HEADER_TITLE: Record<Step, string> = {
  [Step.InitBond]: 'staking.bond.initBondSubtitle',
  [Step.Validators]: 'staking.bond.validatorsSubtitle',
  [Step.ConfirmBond]: 'staking.bond.confirmBondSubtitle',
};

const Bond = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { connections } = useNetworkContext();
  const params = useParams<{ chainId: ChainId }>();

  const [activeStep, setActiveStep] = useState<Step>(Step.InitBond);
  const [_, setValidators] = useState<ValidatorMap>({});

  const { getActiveAccounts } = useAccount();
  const activeAccounts = getActiveAccounts();

  const chainId = params.chainId || ('' as ChainId);
  const api = connections[chainId]?.api;
  const explorers = connections[chainId]?.explorers;
  const addressPrefix = connections[chainId]?.addressPrefix;
  const asset = connections[chainId]?.assets.find((asset) => asset.staking === StakingType.RELAYCHAIN);

  const goToPrevStep = () => {
    if (activeStep === Step.InitBond) {
      navigate(Paths.STAKING);
    } else {
      // TODO: reset data
      setActiveStep((prev) => prev - 1);
    }
  };

  const onBondResult = () => {
    // TODO: save bond value and selected wallets
    setActiveStep(Step.Validators);
  };

  const onSelectValidators = (validators: ValidatorMap) => {
    setValidators(validators);
    setActiveStep(Step.ConfirmBond);
  };

  const onConfirmResult = () => {
    // TODO: init bond and nominate call
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex items-center gap-x-2.5 mb-9 mt-5 px-5">
        <ButtonBack onCustomReturn={goToPrevStep} />
        <p className="font-semibold text-2xl text-neutral-variant">{t('staking.title')}</p>
        <p className="font-semibold text-2xl text-neutral">/</p>
        <h1 className="font-semibold text-2xl text-neutral">{t(HEADER_TITLE[activeStep])}</h1>
      </div>

      {activeStep === Step.InitBond && (
        <InitBond
          accountIds={activeAccounts.map((a) => a.accountId || '')}
          asset={asset}
          api={api}
          chainId={chainId}
          onResult={onBondResult}
        />
      )}
      {activeStep === Step.Validators && (
        <Validators
          api={api}
          chainId={chainId}
          asset={asset}
          explorers={explorers}
          addressPrefix={addressPrefix}
          onResult={onSelectValidators}
        />
      )}
      {activeStep === Step.ConfirmBond && <ConfirmBond api={api} chainId={chainId} onResult={onConfirmResult} />}
    </div>
  );
};

export default Bond;

/* eslint-disable i18next/no-literal-string */
import { ApiPromise } from '@polkadot/api';

// import { useI18n } from '@renderer/context/I18nContext';
import { ChainId } from '@renderer/domain/shared-kernel';
// import { useStaking } from '@renderer/services/staking/stakingService';

type Props = {
  api?: ApiPromise;
  chainId?: ChainId;
  onResult: () => void;
};

const InitBond = ({ api, chainId, onResult }: Props) => {
  // const { t } = useI18n();
  // const data = useStaking();

  if (!chainId || !api) {
    return <div>LOADING</div>;
  }

  return <div>START BOND</div>;
};

export default InitBond;

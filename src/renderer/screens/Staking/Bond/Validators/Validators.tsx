/* eslint-disable i18next/no-literal-string */
import { ApiPromise } from '@polkadot/api';
import cn from 'classnames';
import { useEffect, useState } from 'react';

import { Address, Balance, BaseModal, Button, Checkbox, Icon, Input } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { AccountID, ChainId } from '@renderer/domain/shared-kernel';
import useToggle from '@renderer/hooks/useToggle';
import { Validator } from '@renderer/services/staking/common/types';
import { useStakingData } from '@renderer/services/staking/stakingDataService';

type Props = {
  api?: ApiPromise;
  chainId?: ChainId;
  asset?: Asset;
  onResult: (validators: Validator[]) => void;
};

const Validators = ({ api, chainId, asset, onResult }: Props) => {
  const { t } = useI18n();
  const [isInfoOpen, toggleInfo] = useToggle();
  const { validators, getMaxValidators, getValidators, subscribeActiveEra } = useStakingData();

  const [era, setEra] = useState<number>(0);

  const [query, setQuery] = useState('');
  const [maxValidators, setMaxValidators] = useState<number>();
  const [myValidators, setMyValidators] = useState<Record<AccountID, boolean>>({});

  const validatorList = Object.values(validators).filter((validator) => {
    const addressMatch = validator.address?.toLowerCase().includes(query.toLowerCase());
    const identityMatch = validator.identity?.subName.toLowerCase().includes(query.toLowerCase());
    const subIdentityMatch = validator.identity?.parent.name.toLowerCase().includes(query.toLowerCase());

    return addressMatch || identityMatch || subIdentityMatch;
  });

  useEffect(() => {
    if (!chainId || !api?.isConnected) return;

    let unsubEra: () => void | undefined;

    (async () => {
      unsubEra = await subscribeActiveEra(chainId, api, setEra);
    })();

    return () => {
      unsubEra?.();
    };
  }, [api]);

  useEffect(() => {
    if (!chainId || !api?.isConnected || !era) return;

    (async () => {
      await getValidators(chainId, api, era);
    })();
    setMaxValidators(getMaxValidators(api));
  }, [era, api]);

  if (!api || !chainId || !asset || !maxValidators || validatorList.length === 0) {
    return <div>LOADING</div>;
  }

  const selectValidator = (address: AccountID) => {
    setMyValidators((prev) => ({ ...prev, [address]: !myValidators[address] }));
  };

  const selectedValidators = Object.entries(myValidators).reduce<Validator[]>((acc, [address, isSelected]) => {
    return isSelected ? acc.concat(validators[address]) : acc;
  }, []);

  return (
    <>
      <div className="flex gap-x-5">
        <Input
          wrapperClass="!bg-shade-5 w-[300px]"
          placeholder={t('staking.overview.searchPlaceholder')}
          prefixElement={<Icon name="search" className="w-5 h-5" />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="w-full bg-white rounded-2lg mt-5 pb-14 overflow-y-auto">
        <div className="flex py-2 pl-4 pr-11 border-b border-shade-5 sticky top-0 z-10 bg-white">
          <p className="text-2xs font-bold uppercase text-neutral-variant mr-auto">
            Validators <span className="px-1.25 py-1 rounded-md bg-shade-2 text-shade-40">{validatorList.length}</span>
          </p>
          <p className="pl-3 w-[125px] text-2xs font-bold uppercase text-neutral-variant text-right">Rewards (APY)</p>
          <p className="pl-3 w-[125px] text-2xs font-bold uppercase text-neutral-variant text-right">Own stake</p>
          <p className="pl-3 w-[125px] text-2xs font-bold uppercase text-neutral-variant text-right">Total stake</p>
        </div>
        <ul>
          {validatorList.map(({ address, ownStake, totalStake, apy, identity }) => (
            <li key={address} className="flex items-center pl-4 pr-2 h-12.5 border-b border-shade-5 text-neutral">
              <Checkbox
                className="mr-auto h-full"
                checked={myValidators[address]}
                onChange={() => selectValidator(address)}
              >
                <div className="flex flex-col justify-center ml-2.5">
                  {identity && (
                    <p className={cn('text-sm font-semibold', myValidators[address] && 'text-primary')}>
                      {identity.subName ? `${identity.parent.name}/${identity.subName}` : identity.parent.name}
                    </p>
                  )}
                  <Address
                    canCopy={false}
                    address={address || ''}
                    type="short"
                    addressStyle={identity ? 'small' : 'normal'}
                    size={identity ? 12 : 14}
                    symbols={16}
                  />
                </div>
              </Checkbox>
              <div className="pl-3 w-[125px] text-sm font-semibold text-success text-right">{apy}%</div>
              <div className="pl-3 w-[125px] text-xs font-semibold text-right">
                <Balance value={ownStake || '0'} precision={asset.precision} symbol={asset.symbol} />
              </div>
              <div className="pl-3 w-[125px] text-xs font-semibold text-right">
                <Balance value={totalStake || '0'} precision={asset.precision} symbol={asset.symbol} />
              </div>
              <div className="ml-3">
                <button className="px-1" type="button" onClick={toggleInfo}>
                  •••
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {selectedValidators.length > 0 && (
        <div className="absolute bottom-0 py-2.5 w-full bg-white/75 backdrop-blur-[2px]">
          <Button
            className="mx-auto w-[232px]"
            variant="fill"
            pallet="primary"
            weight="lg"
            disabled={selectedValidators.length !== maxValidators}
            onClick={() => onResult(selectedValidators)}
          >
            {selectedValidators.length !== maxValidators
              ? `Validators ${selectedValidators.length} / ${maxValidators}`
              : 'Continue'}
          </Button>
        </div>
      )}
      <BaseModal isOpen={isInfoOpen} onClose={toggleInfo}>
        Validator&apos;s info
      </BaseModal>
    </>
  );
};

export default Validators;

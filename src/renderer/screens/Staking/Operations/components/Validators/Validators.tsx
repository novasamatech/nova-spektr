import { ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';
import { mapValues } from 'lodash';

import { Icon, Identicon, Shimmering } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Explorer } from '@renderer/domain/chain';
import { Address, ChainId } from '@renderer/domain/shared-kernel';
import { ValidatorMap } from '@renderer/services/staking/common/types';
import { useEra } from '@renderer/services/staking/eraService';
import { useValidators } from '@renderer/services/staking/validatorsService';
import { includes, getComposedIdentity } from '@renderer/shared/utils/strings';
import { toShortAddress } from '@renderer/shared/utils/address';
import { ExplorerLink, BalanceNew } from '@renderer/components/common';
import {
  BodyText,
  InfoPopover,
  FootnoteText,
  Button,
  SearchInput,
  SmallTitleText,
  Checkbox,
} from '@renderer/components/ui-redesign';

const VALIDATORS_SKELETON = Array.from({ length: 10 }, (_, index) => ({ address: index.toString() }));

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  asset: Asset;
  explorers?: Explorer[];
  addressPrefix?: number;
  onGoBack: () => void;
  onResult: (validators: ValidatorMap) => void;
};

export const Validators = ({ api, chainId, asset, explorers, onGoBack, onResult }: Props) => {
  const { t } = useI18n();
  const { subscribeActiveEra } = useEra();
  const { getMaxValidators, getValidators } = useValidators();

  const [era, setEra] = useState<number>();
  const [validators, setValidators] = useState<ValidatorMap>({});
  const [isValidatorsLoading, setIsValidatorsLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [maxValidators, setMaxValidators] = useState(0);
  const [selectedValidators, setSelectedValidators] = useState<Record<Address, boolean>>({});

  useEffect(() => {
    let unsubEra: () => void | undefined;
    (async () => {
      unsubEra = await subscribeActiveEra(api, setEra);
    })();

    return () => {
      unsubEra?.();
    };
  }, []);

  useEffect(() => {
    if (!era) return;

    getValidators(chainId, api, era).then((validators) => {
      setValidators(validators);
      setMaxValidators(getMaxValidators(api));
      setIsValidatorsLoading(false);
      setSelectedValidators(mapValues(validators, () => false));
    });
  }, [era]);

  const validatorList = Object.values(validators).filter((validator) => {
    const addressMatch = includes(validator.address, query);
    const identityMatch = includes(validator.identity?.subName, query);
    const subIdentityMatch = includes(validator.identity?.parent.name, query);

    return addressMatch || identityMatch || subIdentityMatch;
  });

  const getExplorers = (address: Address, explorers: Explorer[] = []) => {
    const explorersContent = explorers.map((explorer) => ({
      id: explorer.name,
      value: <ExplorerLink explorer={explorer} address={address} />,
    }));

    return [{ items: explorersContent }];
  };

  const toggleSelectedValidators = (address: Address) => {
    setSelectedValidators((validators) => ({ ...validators, [address]: !validators[address] }));
  };

  const onCompleteValidators = () => {
    const finalValidators = Object.entries(selectedValidators).reduce<ValidatorMap>((acc, [address, flag]) => {
      if (flag) acc[address] = validators[address];

      return acc;
    }, {});

    onResult(finalValidators);
  };

  const selectedLength = Object.values(selectedValidators).reduce((acc, v) => acc + Number(v), 0);
  const nextStepDisabled = !selectedLength || selectedLength > maxValidators;

  const loadingContent = (
    <div className="flex flex-col gap-y-2 mt-4 px-5">
      <div className="flex flex-col gap-y-2">
        <div className="grid grid-cols-[400px,120px,1fr] items-center gap-x-6">
          <Shimmering width={100} height={18} />
          <Shimmering width={95} height={18} />
          <Shimmering width={95} height={18} />
        </div>

        <ul className="flex flex-col gap-y-4">
          {VALIDATORS_SKELETON.map((v) => (
            <li key={v.address} className="grid grid-cols-[400px,120px,120px] items-center gap-x-6">
              <div className="flex items-center gap-x-1.5">
                <Shimmering circle width={20} height={20} />
                <Shimmering width={250} height={18} />
              </div>
              <Shimmering width={115} height={18} />
              <Shimmering width={115} height={18} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  return (
    <div className="w-[784px] max-h-[660px] pb-4">
      <div className="flex items-center gap-x-1 px-5">
        <SmallTitleText as="p">{t('staking.validators.selectedValidatorsLabel')}</SmallTitleText>
        {isValidatorsLoading ? (
          <Shimmering width={70} height={22} />
        ) : (
          <SmallTitleText as="p" className="text-text-tertiary">
            {t('staking.validators.maxValidatorsLabel', { max: maxValidators })}
          </SmallTitleText>
        )}
        <SearchInput
          wrapperClass="w-[220px] ml-auto"
          placeholder={t('staking.validators.searchPlaceholder')}
          value={query}
          onChange={setQuery}
        />
      </div>

      {isValidatorsLoading && loadingContent}

      {!isValidatorsLoading && (
        <div className="flex flex-col gap-y-2 mt-4">
          <div className="grid grid-cols-[400px,120px,1fr] items-center gap-x-6 px-5">
            <FootnoteText className="text-text-secondary">{t('staking.validators.validatorsTableHeader')}</FootnoteText>
            <FootnoteText className="text-text-secondary">{t('staking.validators.ownStakeTableHeader')}</FootnoteText>
            <FootnoteText className="text-text-secondary">{t('staking.validators.totalStakeTableHeader')}</FootnoteText>
          </div>

          <ul className="flex flex-col gap-y-4 overflow-y-auto max-h-[448px]">
            {validatorList.map((v) => (
              <li
                key={v.address}
                className="grid grid-cols-[400px,120px,120px,1fr] items-center gap-x-6 px-5 shrink-0 h-9 hover:bg-hover"
              >
                <Checkbox
                  checked={selectedValidators[v.address]}
                  disabled={v.blocked}
                  onChange={() => toggleSelectedValidators(v.address)}
                >
                  <div className="flex gap-x-2">
                    <Identicon address={v.address} background={false} size={20} />
                    {v.identity ? (
                      <BodyText>{getComposedIdentity(v.identity)}</BodyText>
                    ) : (
                      <BodyText>{toShortAddress(v.address, 11)}</BodyText>
                    )}
                  </div>
                </Checkbox>
                <BodyText>
                  <BalanceNew value={v.ownStake || '0'} asset={asset} />
                </BodyText>
                <BodyText>
                  <BalanceNew value={v.totalStake || '0'} asset={asset} />
                </BodyText>
                <InfoPopover data={getExplorers(v.address, explorers)} position="top-full right-0">
                  <Icon name="info" size={14} className="text-icon-default ml-2 mr-auto" />
                </InfoPopover>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-between mt-7 px-5">
        <Button variant="text" onClick={onGoBack}>
          {t('staking.bond.backButton')}
        </Button>
        <Button disabled={nextStepDisabled} onClick={onCompleteValidators}>
          {selectedLength
            ? t('staking.validators.continueButton', { selected: selectedLength })
            : t('staking.validators.selectValidatorButton')}
        </Button>
      </div>
    </div>
  );
};

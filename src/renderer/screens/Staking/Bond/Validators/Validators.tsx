import { ApiPromise } from '@polkadot/api';
import cn from 'classnames';
import { useEffect, useState } from 'react';

import { Explorers } from '@renderer/components/common';
import { Balance, Button, Icon, Identicon, Input, Popover, Table } from '@renderer/components/ui';
import Shimmering from '@renderer/components/ui/Shimmering/Shimmering';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Explorer } from '@renderer/domain/chain';
import { AccountID, ChainId } from '@renderer/domain/shared-kernel';
import { Validator } from '@renderer/domain/validator';
import { ValidatorMap } from '@renderer/services/staking/common/types';
import { useEra } from '@renderer/services/staking/eraService';
import { useValidators } from '@renderer/services/staking/validatorsService';
import { getComposedIdentity, getShortAddress } from '@renderer/utils/strings';

const VALIDATORS_SKELETON = Array.from({ length: 10 }, (_, index) => ({ address: index.toString() }));

type Props = {
  api?: ApiPromise;
  chainId?: ChainId;
  asset?: Asset;
  explorers?: Explorer[];
  addressPrefix?: number;
  onResult: (validators: ValidatorMap) => void;
};

const Validators = ({ api, chainId, asset, explorers, addressPrefix, onResult }: Props) => {
  const { t } = useI18n();
  const { getMaxValidators, getValidators } = useValidators();
  const { subscribeActiveEra } = useEra();

  const [era, setEra] = useState<number>();
  const [validators, setValidators] = useState<ValidatorMap>({});

  const [query, setQuery] = useState('');
  const [maxValidators, setMaxValidators] = useState<number>(0);
  const [selectedValidators, setSelectedValidators] = useState<AccountID[]>([]);

  useEffect(() => {
    if (!chainId || !api?.isConnected) return;

    let unsubEra: () => void | undefined;
    (async () => {
      unsubEra = await subscribeActiveEra(api, setEra);
    })();

    return () => {
      unsubEra?.();
    };
  }, [api]);

  useEffect(() => {
    if (!chainId || !api?.isConnected || !era) return;

    (async () => {
      const validators = await getValidators(chainId, api, era);
      setValidators(validators);
      setMaxValidators(getMaxValidators(api));
    })();
  }, [api, era]);

  const validatorList = Object.values(validators).filter((validator) => {
    const addressMatch = validator.address?.toLowerCase().includes(query.toLowerCase());
    const identityMatch = validator.identity?.subName.toLowerCase().includes(query.toLowerCase());
    const subIdentityMatch = validator.identity?.parent.name.toLowerCase().includes(query.toLowerCase());

    return addressMatch || identityMatch || subIdentityMatch;
  });

  const pushSelectedValidators = () => {
    const finalValidators = selectedValidators.reduce<ValidatorMap>((acc, address) => {
      acc[address] = validators[address];

      return acc;
    }, {});

    onResult(finalValidators);
  };

  const validatorsLoading = !api || !chainId || !maxValidators || !asset;
  const validatorsAreSelected = selectedValidators.length > 0;
  const nextStepDisabled = selectedValidators.length === 0 || selectedValidators.length > maxValidators;

  return (
    <div className="overflow-y-scroll">
      <section className="flex flex-col gap-y-5 w-[900px] p-5 mb-28 mx-auto bg-shade-2 rounded-2lg">
        <div className="flex justify-between">
          <Input
            wrapperClass="!bg-shade-5 w-[300px]"
            placeholder={t('staking.validators.searchPlaceholder')}
            prefixElement={<Icon name="search" className="w-5 h-5" />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {/* TODO: implement in future */}
          {/*<Filter*/}
          {/*  placeholder={t('staking.validators.filterButton')}*/}
          {/*  activeIds={[]}*/}
          {/*  options={[]}*/}
          {/*  onChange={() => {}}*/}
          {/*/>*/}
        </div>

        <Table
          by="address"
          dataSource={validatorsLoading ? VALIDATORS_SKELETON : validatorList}
          selectedKeys={selectedValidators}
          onSelect={validatorsLoading ? undefined : setSelectedValidators}
        >
          <Table.Header>
            <Table.Column dataKey="address" align="left">
              <div className="flex items-center gap-x-1">
                {t('staking.validators.validatorsTableHeader')}
                {validatorsLoading ? (
                  <Shimmering width={20} height={10} />
                ) : (
                  <span className="px-1.25 py-1 rounded-md bg-shade-2 text-shade-40">{validatorList.length}</span>
                )}
              </div>
            </Table.Column>
            <Table.Column dataKey="ownStake" width={150}>
              {t('staking.validators.ownStakeTableHeader')}
            </Table.Column>
            <Table.Column dataKey="totalStake" width={150} sortable>
              {t('staking.validators.totalStakeTableHeader')}
            </Table.Column>
            <Table.Column dataKey="actions" width={50} />
          </Table.Header>
          <Table.Body<Validator>>
            {({ address, identity, ownStake, totalStake, oversubscribed, slashed, blocked }) => (
              <Table.Row key={address} height="lg" selectable={!blocked}>
                <Table.Cell>
                  {validatorsLoading ? (
                    <div className="flex items-center gap-x-1.5">
                      <Shimmering circle width={24} height={24} />
                      <Shimmering width={250} height={20} />
                    </div>
                  ) : (
                    <div className="flex items-center gap-x-1.5">
                      <Identicon address={address} background={false} />
                      {identity ? (
                        <span className="text-sm font-semibold text-neutral">{getComposedIdentity(identity)}</span>
                      ) : (
                        <span className="text-sm font-semibold text-neutral-variant">
                          {getShortAddress(address, 11)}
                        </span>
                      )}
                      {(oversubscribed || slashed || blocked) && (
                        <div className="ml-1.5">
                          {oversubscribed && (
                            <Popover
                              titleIcon={<Icon className="text-alert" name="warnCutout" size={16} />}
                              titleText={t('staking.validators.oversubPopoverTitle')}
                              content={t('staking.validators.oversubPopoverSubtitle')}
                            >
                              <Icon className="text-alert" name="warnCutout" size={16} />
                            </Popover>
                          )}
                          {slashed && (
                            <Popover
                              titleIcon={<Icon className="text-error" name="disableCutout" size={16} />}
                              titleText={t('staking.validators.slashedPopoverTitle')}
                              content={t('staking.validators.slashedPopoverSubtitle')}
                            >
                              <Icon className="text-error" name="disableCutout" size={16} />
                            </Popover>
                          )}
                          {blocked && (
                            <Popover
                              titleIcon={<Icon className="text-shade-40" name="removeCutout" size={16} />}
                              titleText={t('staking.validators.blockedPopoverTitle')}
                              content={t('staking.validators.blockedPopoverSubtitle')}
                            >
                              <Icon className="text-shade-40" name="removeCutout" size={16} />
                            </Popover>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Table.Cell>
                <Table.Cell className="text-sm font-semibold">
                  {validatorsLoading ? (
                    <Shimmering width={130} height={20} />
                  ) : (
                    <Balance value={ownStake || '0'} precision={asset.precision} symbol={asset.symbol} />
                  )}
                </Table.Cell>
                <Table.Cell className="text-sm font-semibold">
                  {validatorsLoading ? (
                    <Shimmering width={130} height={20} />
                  ) : (
                    <Balance value={totalStake || '0'} precision={asset.precision} symbol={asset.symbol} />
                  )}
                </Table.Cell>
                <Table.Cell>
                  {validatorsLoading ? (
                    <Shimmering width={40} height={20} />
                  ) : (
                    <Explorers address={address} explorers={explorers} addressPrefix={addressPrefix} />
                  )}
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>

        {!validatorsLoading && (
          <div
            className={cn(
              'absolute bottom-4 left-1/2 -translate-x-1/2 p-5',
              'shadow-surface bg-white rounded-2lg border border-shade-10',
            )}
          >
            <Button
              variant="fill"
              pallet="primary"
              weight="lg"
              disabled={nextStepDisabled}
              onClick={pushSelectedValidators}
            >
              {validatorsAreSelected
                ? t('staking.validators.continueButton', { selected: selectedValidators.length, max: maxValidators })
                : t('staking.validators.selectValidatorButton')}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
};

export default Validators;

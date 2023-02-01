import { BN, BN_ZERO } from '@polkadot/util';
import cn from 'classnames';
import { useState } from 'react';

import { Explorers } from '@renderer/components/common';
import { Balance, Icon, Identicon, Popover, Shimmering, Table } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Explorer } from '@renderer/domain/chain';
import { AccountID } from '@renderer/domain/shared-kernel';
import { Validator } from '@renderer/domain/validator';
import { getComposedIdentity, getShortAddress } from '@renderer/utils/strings';

type ValidatorWithNomination = Validator & { nominated: string };
type AvailableColumns = ('apy' | 'ownStake' | 'totalStake' | 'nominated')[];

const VALIDATORS_SKELETON = Array.from({ length: 10 }, (_, index) => ({ address: index.toString() }));

const getValidatorsWithNomination = (stash: AccountID, validators: Validator[]): ValidatorWithNomination[] => {
  return validators.map((validator) => {
    const nominated = validator.nominators.reduce((acc, data) => {
      return data.who === stash ? acc.add(new BN(data.value)) : acc;
    }, BN_ZERO);

    return { ...validator, nominated: nominated.toString() };
  });
};

type Props = {
  stash?: AccountID;
  validators: Validator[];
  columns?: AvailableColumns;
  amountBadge?: boolean;
  dataIsLoading?: boolean;
  showHeader?: boolean;
  asset?: Asset;
  explorers?: Explorer[];
  addressPrefix?: number;
  className?: string;
  onSelect?: (selected: AccountID[]) => void;
};

const ValidatorsTable = ({
  stash,
  validators,
  columns = [],
  amountBadge = true,
  dataIsLoading,
  showHeader = true,
  asset,
  explorers,
  addressPrefix,
  className,
  onSelect,
}: Props) => {
  const { t } = useI18n();

  const [selectedValidators, setSelectedValidators] = useState<AccountID[]>([]);

  const includeNomination = !stash || !columns.includes('nominated');
  const extendedValidators = includeNomination ? validators : getValidatorsWithNomination(stash, validators);

  const selectValidator = (selected: AccountID[]) => {
    setSelectedValidators(selected);
    onSelect?.(selected);
  };

  const isLoading = dataIsLoading || !asset;
  const canSelect = showHeader && onSelect;

  return (
    <Table
      by="address"
      className={className}
      dataSource={isLoading ? VALIDATORS_SKELETON : extendedValidators}
      selectedKeys={canSelect ? selectedValidators : undefined}
      onSelect={selectValidator}
    >
      <Table.Header className={cn(!showHeader && 'hidden')}>
        <Table.Column dataKey="address" align="left">
          <div className="flex items-center gap-x-1">
            {t('staking.validators.validatorsTableHeader')}
            {amountBadge &&
              (isLoading ? (
                <Shimmering width={20} height={10} />
              ) : (
                <span className="px-1.25 py-1 rounded-md bg-shade-2 text-shade-40">{validators.length}</span>
              ))}
          </div>
        </Table.Column>
        {columns.includes('ownStake') && (
          <Table.Column dataKey="ownStake" width={150}>
            {t('staking.validators.ownStakeTableHeader')}
          </Table.Column>
        )}
        {columns.includes('totalStake') && (
          <Table.Column dataKey="totalStake" width={150} sortable>
            {t('staking.validators.totalStakeTableHeader')}
          </Table.Column>
        )}
        {columns.includes('nominated') && (
          <Table.Column dataKey="nominated" width={150}>
            {t('staking.validators.nominatedTableHeader')}
          </Table.Column>
        )}
        <Table.Column dataKey="actions" width={50} />
      </Table.Header>
      <Table.Body<ValidatorWithNomination>>
        {({ address, identity, ownStake, totalStake, oversubscribed, slashed, blocked, nominated }) => (
          <Table.Row key={address} className="bg-shade-1" height="lg" selectable={!blocked && showHeader}>
            <Table.Cell>
              {isLoading ? (
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
                    <span className="text-sm font-semibold text-neutral-variant">{getShortAddress(address, 11)}</span>
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
            {columns.includes('ownStake') && (
              <Table.Cell className="text-sm font-semibold">
                {isLoading || !asset ? (
                  <Shimmering width={130} height={20} />
                ) : (
                  <Balance value={ownStake || '0'} precision={asset.precision} symbol={asset.symbol} />
                )}
              </Table.Cell>
            )}
            {columns.includes('totalStake') && (
              <Table.Cell className="text-sm font-semibold">
                {isLoading || !asset ? (
                  <Shimmering width={130} height={20} />
                ) : (
                  <Balance value={totalStake || '0'} precision={asset.precision} symbol={asset.symbol} />
                )}
              </Table.Cell>
            )}
            {columns.includes('nominated') && (
              <Table.Cell>
                {isLoading ? (
                  <Shimmering width={40} height={20} />
                ) : (
                  <>
                    <Balance
                      className="font-semibold "
                      value={nominated}
                      precision={asset.precision || 0}
                      symbol={asset.symbol}
                    />
                    {nominated === '0' && (
                      <p className="text-2xs text-neutral-variant">{t('staking.nominators.notAssigned')}</p>
                    )}
                  </>
                )}
              </Table.Cell>
            )}
            <Table.Cell>
              {isLoading ? (
                <Shimmering width={40} height={20} />
              ) : (
                <Explorers address={address} explorers={explorers} addressPrefix={addressPrefix} />
              )}
            </Table.Cell>
          </Table.Row>
        )}
      </Table.Body>
    </Table>
  );
};

export default ValidatorsTable;

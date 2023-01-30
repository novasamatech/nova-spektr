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

const VALIDATORS_SKELETON = Array.from({ length: 10 }, (_, index) => ({ address: index.toString() }));

type Props = {
  validators: Validator[];
  dataIsLoading?: boolean;
  showHeader?: boolean;
  asset?: Asset;
  explorers?: Explorer[];
  addressPrefix?: number;
  onSelect?: (selected: AccountID[]) => void;
};

const ValidatorsTable = ({
  validators,
  dataIsLoading,
  showHeader = true,
  asset,
  explorers,
  addressPrefix,
  onSelect,
}: Props) => {
  const { t } = useI18n();

  const [selectedValidators, setSelectedValidators] = useState<AccountID[]>([]);

  const selectValidator = (selected: AccountID[]) => {
    setSelectedValidators(selected);
    onSelect?.(selected);
  };

  const isLoading = dataIsLoading || !asset;

  return (
    <Table
      by="address"
      dataSource={isLoading ? VALIDATORS_SKELETON : validators}
      selectedKeys={showHeader ? selectedValidators : undefined}
      onSelect={isLoading || !showHeader ? undefined : selectValidator}
    >
      <Table.Header className={cn(!showHeader && 'hidden')}>
        <Table.Column dataKey="address" align="left">
          <div className="flex items-center gap-x-1">
            {t('staking.validators.validatorsTableHeader')}
            {isLoading ? (
              <Shimmering width={20} height={10} />
            ) : (
              <span className="px-1.25 py-1 rounded-md bg-shade-2 text-shade-40">{validators.length}</span>
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
          <Table.Row key={address} height="lg" selectable={!blocked && showHeader}>
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
            <Table.Cell className="text-sm font-semibold">
              {isLoading || !asset ? (
                <Shimmering width={130} height={20} />
              ) : (
                <Balance value={ownStake || '0'} precision={asset.precision} symbol={asset.symbol} />
              )}
            </Table.Cell>
            <Table.Cell className="text-sm font-semibold">
              {isLoading || !asset ? (
                <Shimmering width={130} height={20} />
              ) : (
                <Balance value={totalStake || '0'} precision={asset.precision} symbol={asset.symbol} />
              )}
            </Table.Cell>
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

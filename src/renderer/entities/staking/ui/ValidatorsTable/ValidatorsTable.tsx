import { type ReactNode } from 'react';

import { type Asset, type Chain, type Validator } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, nonNullable, toAddress } from '@/shared/lib/utils';
import { BodyText, FootnoteText } from '@/shared/ui';
import { AccountExplorers, Address, AssetBalance, Hash, Identicon } from '@/shared/ui-entities';
import { type AccountIdentity } from '@/domains/network';
// eslint-disable-next-line boundaries/element-types
import { AssetFiatBalance } from '@/widgets/price';

const TABLE_GRID_CELLS = 'grid-cols-[1fr_128px_128px_40px]';

type TableProps = {
  validators: Validator[];
  listClassName?: string;
  children: (validator: Validator, rowStyle: string) => ReactNode;
};

const ValidatorsTableRoot = ({ validators, children, listClassName }: TableProps) => {
  const { t } = useI18n();

  const rowStyle = cnTw('group grid h-14 shrink-0 items-center pr-2 pl-5 hover:bg-hover', TABLE_GRID_CELLS);

  return (
    <div className="mt-4 flex flex-col gap-y-2">
      <div className={cnTw('grid items-center pr-2 pl-5', TABLE_GRID_CELLS)}>
        <FootnoteText className="text-text-secondary">{t('staking.validators.validatorTableHeader')}</FootnoteText>
        <FootnoteText className="px-3 text-text-secondary">{t('staking.validators.ownStakeTableHeader')}</FootnoteText>
        <FootnoteText className="px-3 text-text-secondary">
          {t('staking.validators.totalStakeTableHeader')}
        </FootnoteText>
      </div>

      <ul className={cnTw('flex max-h-[448px] flex-col overflow-y-auto', listClassName)}>
        {validators.map((validator) => children(validator, rowStyle))}
      </ul>
    </div>
  );
};

type RowProps = {
  validator: Validator;
  identity?: AccountIdentity;
  chain?: Chain;
  asset?: Asset;
};

const ValidatorRow = ({ validator, identity, chain, asset }: RowProps) => {
  const address = toAddress(validator.accountId, { prefix: chain?.addressPrefix });
  return (
    <>
      <div className="mr-auto flex items-center gap-x-2 text-text-primary" data-testid="validator">
        <Address showIcon iconSize={20} address={address} title={identity?.name} />
      </div>
      <div className="flex flex-col px-3">
        {asset && (
          <>
            <AssetBalance value={validator.ownStake || '0'} asset={asset} />
            <AssetFiatBalance amount={validator.ownStake} asset={asset} />
          </>
        )}
      </div>
      <div className="flex flex-col px-3">
        {asset && (
          <>
            <AssetBalance value={validator.totalStake || '0'} asset={asset} />
            <AssetFiatBalance amount={validator.totalStake} asset={asset} />
          </>
        )}
      </div>

      {nonNullable(chain) && <AccountExplorers accountId={validator.accountId} chain={chain} />}
    </>
  );
};

const ValidatorShortRow = ({ validator, identity, chain }: Pick<RowProps, 'validator' | 'identity' | 'chain'>) => (
  <div className="mr-auto flex items-center gap-x-2">
    <Identicon
      address={toAddress(validator.accountId, { prefix: chain?.addressPrefix })}
      background={false}
      size={20}
    />
    <div className="flex w-[276px] flex-col">
      {identity ? (
        <BodyText className="text-text-secondary">{identity.name}</BodyText>
      ) : (
        <BodyText className="text-text-secondary">
          <Hash value={toAddress(validator.accountId, { prefix: chain?.addressPrefix })} variant="truncate" />
        </BodyText>
      )}
    </div>
  </div>
);

export const ValidatorsTable = Object.assign(ValidatorsTableRoot, {
  Row: ValidatorRow,
  ShortRow: ValidatorShortRow,
});

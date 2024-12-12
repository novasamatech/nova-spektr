import { type Asset, type Explorer, type Validator } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { BodyText, FootnoteText, HelpText, IconButton, Identicon } from '@/shared/ui';
import { Hash } from '@/shared/ui-entities';
// eslint-disable-next-line boundaries/element-types
import { type AccountIdentity } from '@/domains/identity';
import { AssetBalance } from '@/entities/asset';
import { AssetFiatBalance } from '@/entities/price';
import { ExplorersPopover } from '@/entities/wallet';

const TABLE_GRID_CELLS = 'grid-cols-[1fr,128px,128px,40px]';

type TableProps = {
  validators: Validator[];
  listClassName?: string;
  children: (validator: Validator, rowStyle: string) => JSX.Element;
};

const ValidatorsTableRoot = ({ validators, children, listClassName }: TableProps) => {
  const { t } = useI18n();

  const rowStyle = cnTw('group grid h-14 shrink-0 items-center pl-5 pr-2 hover:bg-hover', TABLE_GRID_CELLS);

  return (
    <div className="mt-4 flex flex-col gap-y-2">
      <div className={cnTw('grid items-center pl-5 pr-2', TABLE_GRID_CELLS)}>
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
  asset?: Asset;
  explorers?: Explorer[];
};

const ValidatorRow = ({ validator, identity, asset, explorers = [] }: RowProps) => (
  <>
    <div className="mr-auto flex items-center gap-x-2" data-testid="validator">
      <Identicon address={validator.address} background={false} size={20} />
      {identity ? (
        <div className="flex flex-col">
          <BodyText>{identity.name}</BodyText>
          <HelpText className="text-text-tertiary">{validator.address}</HelpText>
        </div>
      ) : (
        <BodyText>{validator.address}</BodyText>
      )}
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

    <ExplorersPopover button={<IconButton name="details" />} address={validator.address} explorers={explorers} />
  </>
);

const ValidatorShortRow = ({ validator, identity }: Pick<RowProps, 'validator' | 'identity'>) => (
  <div className="mr-auto flex items-center gap-x-2">
    <Identicon address={validator.address} background={false} size={20} />
    <div className="flex w-[276px] flex-col">
      {identity ? (
        <BodyText className="text-text-secondary">{identity.name}</BodyText>
      ) : (
        <BodyText className="text-text-secondary">
          <Hash value={validator.address} variant="truncate" />
        </BodyText>
      )}
    </div>
  </div>
);

export const ValidatorsTable = Object.assign(ValidatorsTableRoot, {
  Row: ValidatorRow,
  ShortRow: ValidatorShortRow,
});

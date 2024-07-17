import { type Asset, type Explorer, type Validator } from '@shared/core';
import { cnTw, getComposedIdentity } from '@shared/lib/utils';
import { BodyText, FootnoteText, HelpText, IconButton, Identicon, Truncate } from '@shared/ui';
import { AssetBalance } from '@entities/asset';
import { AssetFiatBalance } from '@entities/price/ui/AssetFiatBalance';
import { ExplorersPopover } from '@entities/wallet';
import { useI18n } from '@app/providers';

const TABLE_GRID_CELLS = 'grid-cols-[1fr,128px,128px,40px]';

type TableProps = {
  validators: Validator[];
  listClassName?: string;
  children: (validator: Validator, rowStyle: string) => JSX.Element;
};

const ValidatorsTableRoot = ({ validators, children, listClassName }: TableProps) => {
  const { t } = useI18n();

  const rowStyle = cnTw('grid items-center pl-5 pr-2 shrink-0 h-14 hover:bg-hover group', TABLE_GRID_CELLS);

  return (
    <div className="flex flex-col gap-y-2 mt-4">
      <div className={cnTw('grid items-center pl-5 pr-2', TABLE_GRID_CELLS)}>
        <FootnoteText className="text-text-secondary">{t('staking.validators.validatorTableHeader')}</FootnoteText>
        <FootnoteText className="text-text-secondary px-3">{t('staking.validators.ownStakeTableHeader')}</FootnoteText>
        <FootnoteText className="text-text-secondary px-3">
          {t('staking.validators.totalStakeTableHeader')}
        </FootnoteText>
      </div>

      <ul className={cnTw('flex flex-col max-h-[448px] overflow-y-auto', listClassName)}>
        {validators.map((validator) => children(validator, rowStyle))}
      </ul>
    </div>
  );
};

type RowProps = {
  validator: Validator;
  asset?: Asset;
  explorers?: Explorer[];
};

const ValidatorRow = ({ validator, asset, explorers = [] }: RowProps) => (
  <>
    <div className="flex gap-x-2 items-center mr-auto" data-testid="validator">
      <Identicon address={validator.address} background={false} size={20} />
      {validator.identity ? (
        <div className="flex flex-col">
          <BodyText>{getComposedIdentity(validator.identity)}</BodyText>
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

    <ExplorersPopover button={<IconButton name="info" />} address={validator.address} explorers={explorers} />
  </>
);

const ValidatorShortRow = ({ validator }: Pick<RowProps, 'validator'>) => (
  <div className="flex gap-x-2 items-center mr-auto">
    <Identicon address={validator.address} background={false} size={20} />
    <div className="flex flex-col max-w-[276px]">
      {validator.identity ? (
        <BodyText className="text-text-secondary">{getComposedIdentity(validator.identity)}</BodyText>
      ) : (
        <Truncate className="text-body text-text-secondary" ellipsis="..." start={4} end={4} text={validator.address} />
      )}
    </div>
  </div>
);

export const ValidatorsTable = Object.assign(ValidatorsTableRoot, {
  Row: ValidatorRow,
  ShortRow: ValidatorShortRow,
});

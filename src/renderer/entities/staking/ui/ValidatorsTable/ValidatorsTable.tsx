import { Asset, Explorer, Validator } from '@renderer/shared/core';
import { cnTw, getComposedIdentity } from '@renderer/shared/lib/utils';
import { BodyText, FootnoteText, HelpText, Icon, Identicon, InfoPopover } from '@renderer/shared/ui';
import { AssetBalance } from '@renderer/entities/asset';
import { AssetFiatBalance } from '@renderer/entities/price/ui/AssetFiatBalance';
import { useI18n } from '@renderer/app/providers';
import { getExplorers } from '../../../../pages/Staking/Operations/common/utils';

const TABLE_GRID_CELLS = 'grid-cols-[1fr,128px,128px,40px]';

type TableProps = {
  validators: Validator[];
  children: (validtor: Validator, rowStyle: string) => JSX.Element;
};

export const ValidatorsTable = ({ validators, children }: TableProps) => {
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

      <ul className="flex flex-col [overflow-y:overlay] max-h-[448px]">
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

const ValidatorRow = ({ validator, explorers, asset }: RowProps) => (
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
    <InfoPopover data={getExplorers(validator.address, explorers)} position="top-full right-0" buttonClassName="p-2">
      <Icon name="info" size={16} className="mr-auto group-hover:text-icon-active" />
    </InfoPopover>
  </>
);

ValidatorsTable.Row = ValidatorRow;

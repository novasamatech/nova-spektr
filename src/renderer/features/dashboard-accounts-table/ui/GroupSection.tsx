import { type BN } from '@polkadot/util';
import { type TFunction } from 'i18next';
import { memo } from 'react';

import { type Asset, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, formatBalance, toAddress } from '@/shared/lib/utils';
import { BodyText, FootnoteText, HelpText, Icon } from '@/shared/ui';
import { AssetBalance, ChainIcon, Identicon, WalletIcon } from '@/shared/ui-entities';
import { NamedAccount } from '@/widgets/NameResolver';
import { AssetFiatBalance } from '@/widgets/price';
import { type AccountGroup, type AccountRow, type NumericKey } from '../lib/types';

import { GRID_TEMPLATE, GROUP_HEADER_CLASS, NUMERIC_COLUMNS, ROW_CLASS } from './tableLayout';

type Props = {
  group: AccountGroup;
  open: boolean;
  onToggle: (key: string) => void;
  fiatVisible: boolean;
  formatSubtotal: (value: number | null) => string;
};

/**
 * Plain-text token amount, matching `AssetBalance`'s own formatting — used
 * inside the translated "incl. X vested" hint, where a component can't be
 * interpolated.
 */
const formatTokenAmount = (value: BN, asset: Asset, t: TFunction): string => {
  const { value: formattedValue, decimalPlaces, suffix } = formatBalance(value, asset.precision);
  const number = t('assetBalance.number', { value: formattedValue, maximumFractionDigits: decimalPlaces });

  return `${number}${suffix} ${asset.symbol}`;
};

type WalletTypeBadgeProps = {
  wallet: Wallet | null;
  label: string;
};

const WalletTypeBadge = ({ wallet, label }: WalletTypeBadgeProps) => (
  <span className="shrink-0" title={label}>
    {wallet ? <WalletIcon type={wallet.type} size={16} /> : <Icon name="addressBook" size={14} />}
  </span>
);

type NumericCellProps = {
  value: BN | null;
  asset: Asset;
  fiatVisible: boolean;
  semibold?: boolean;
  vestedAmount?: BN;
};

const NumericCell = ({ value, asset, fiatVisible, semibold, vestedAmount }: NumericCellProps) => {
  const { t } = useI18n();

  if (value === null) {
    return <BodyText className="text-right text-text-tertiary">—</BodyText>;
  }

  return (
    <div className="flex flex-col items-end">
      <AssetBalance value={value} asset={asset} className={cnTw(semibold && 'font-semibold')} />
      {fiatVisible ? <AssetFiatBalance asset={asset} amount={value} /> : null}
      {vestedAmount && !vestedAmount.isZero() ? (
        <HelpText className="text-text-tertiary">
          {t('dashboard.accountsTable.inclVested', { amount: formatTokenAmount(vestedAmount, asset, t) })}
        </HelpText>
      ) : null}
    </div>
  );
};

const numericValue = (row: AccountRow, key: NumericKey): BN | null => (key === 'total' ? row.totalBN : row.split[key]);

type DataRowProps = {
  row: AccountRow;
  fiatVisible: boolean;
};

const DataRow = ({ row, fiatVisible }: DataRowProps) => (
  <div className={cnTw(GRID_TEMPLATE, ROW_CLASS, 'hover:bg-block-background')}>
    {/* 18px = 12px caret glyph + 6px gap, so the chain icon lines up under the
        group header's caret column rather than the row's own left edge. */}
    <div className="flex min-w-0 items-center gap-x-2 pl-[18px]">
      <ChainIcon chain={row.chain} size={16} />
      <FootnoteText className="truncate">{row.chain.name}</FootnoteText>
    </div>

    <span className="min-w-0 truncate" title={row.displayAddress}>
      <FootnoteText className="truncate text-text-secondary">{row.shortAddress}</FootnoteText>
    </span>

    {NUMERIC_COLUMNS.map((key) => (
      <NumericCell
        key={key}
        value={numericValue(row, key)}
        asset={row.asset}
        fiatVisible={fiatVisible}
        semibold={key === 'total'}
        vestedAmount={key === 'other' ? row.split.vestedHint : undefined}
      />
    ))}
  </div>
);

export const GroupSection = memo(({ group, open, onToggle, fiatVisible, formatSubtotal }: Props) => {
  const { t } = useI18n();

  const walletTypeLabel = t(`dashboard.accountsTable.walletTypes.${group.walletTypeBucket}`);
  const handleToggle = () => onToggle(group.key);

  return (
    <div>
      <button type="button" className={cnTw('flex w-full text-left', GROUP_HEADER_CLASS)} onClick={handleToggle}>
        <Icon name={open ? 'down' : 'right'} size={12} className="shrink-0 text-text-tertiary" />

        <Identicon address={toAddress(group.accountId)} size={24} />

        <div className="min-w-0">
          <NamedAccount
            accountId={group.accountId}
            chain={null}
            title={group.name}
            wallet={group.wallet}
            variant="short"
            hideIcon
            hideAddress
            titleClass="truncate text-body font-semibold"
          />
        </div>

        <WalletTypeBadge wallet={group.wallet} label={walletTypeLabel} />

        <FootnoteText className="shrink-0 text-text-tertiary">
          {t('dashboard.accountsTable.groupMeta', {
            count: group.assetCount,
            chains: group.chainCount,
            assets: group.assetCount,
          })}
        </FootnoteText>

        <div className="flex-1" />

        {fiatVisible ? (
          <div className="flex shrink-0 items-center gap-x-1.5">
            <FootnoteText className="text-text-tertiary">{t('dashboard.accountsTable.subtotal')}</FootnoteText>
            <BodyText className="font-semibold tabular-nums">{formatSubtotal(group.subtotalFiat)}</BodyText>
          </div>
        ) : null}
      </button>

      {open ? (
        <div>
          {group.rows.map((row) => (
            <DataRow key={row.id} row={row} fiatVisible={fiatVisible} />
          ))}
        </div>
      ) : null}
    </div>
  );
});

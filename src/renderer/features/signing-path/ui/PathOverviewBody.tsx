import { type BN } from '@polkadot/util';

import { type Asset } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { CaptionText, HelpText } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { type PathNode } from '@/domains/backend';

import { PathHopRow } from './PathHopRow';
import { type PathNodeView } from './path-views';

type Props = {
  path: PathNode[];
  views: PathNodeView[];
  /**
   * Balance lookup is optional — supplied by SigningPathInline so the popover
   * surfaces per-hop balances. PathReviewPopover renders structure-only views
   * and omits it.
   *
   * `isFeeHop` is true for hops that pay fees / deposits (every node except the
   * source, when `feeAsset` differs from `asset`). Lookup callers can switch
   * which asset's balance they fetch on that flag.
   */
  getBalance?: (accountId: AccountId, isFeeHop: boolean) => BN | string | null;
  asset?: Asset;
  /**
   * Asset used for fees / multisig deposit (typically the chain's native
   * token). When set and different from `asset`, the source node renders its
   * `asset` balance while the remaining hops render their `feeAsset` balance —
   * matches the on-chain reality where the operation amount lives on the source
   * while the rest of the path settles fees in native.
   */
  feeAsset?: Asset;
  errorAccountIds?: ReadonlySet<AccountId>;
};

/**
 * Inner content of the signing-path overview popover. Shared by
 * PathReviewPopover and SigningPathInline so the structure (header + numbered
 * hop list) is defined once.
 */
export const PathOverviewBody = ({ path, views, getBalance, asset, feeAsset, errorAccountIds }: Props) => {
  const { t } = useI18n();
  const hasSplitAssets = !!feeAsset && !!asset && feeAsset.assetId !== asset.assetId;

  return (
    <div className="flex w-[340px] flex-col gap-y-3 p-4">
      <div className="flex items-center justify-between">
        <CaptionText className="text-text-tertiary uppercase">{t('signingPath.fullSigningPath')}</CaptionText>
        <HelpText className="text-text-tertiary">
          {t('signingPath.hopsCount', { count: Math.max(0, path.length - 1) })}
        </HelpText>
      </div>
      <div className="flex flex-col">
        {path.map((node, idx) => {
          const v = views[idx];
          if (!v) return null;
          const isLast = idx === path.length - 1;
          const isFeeHop = hasSplitAssets && idx > 0;
          const hopAsset = isFeeHop ? feeAsset : asset;
          const balanceValue = getBalance ? getBalance(node.accountId, isFeeHop) : null;
          const hasError = errorAccountIds?.has(node.accountId) ?? false;
          const balanceNode =
            balanceValue && hopAsset ? (
              <AssetBalance
                value={balanceValue}
                asset={hopAsset}
                className={cnTw('text-footnote', hasError ? 'text-text-negative' : 'text-text-secondary')}
              />
            ) : null;

          return (
            <PathHopRow
              key={`${idx}-${node.kind}-${node.accountId}`}
              view={v}
              index={idx}
              isLast={isLast}
              rightSlot={balanceNode}
            />
          );
        })}
      </div>
    </div>
  );
};

import { type BN } from '@polkadot/util';

import { type Asset } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { CaptionText, FootnoteText, HelpText } from '@/shared/ui';
import { AssetBalance, WalletAccountIcon } from '@/shared/ui-entities';
import { type PathNode } from '@/domains/backend';

import { type PathNodeView } from './path-views';

type Props = {
  path: PathNode[];
  views: PathNodeView[];
  /**
   * Balance lookup is optional — supplied by SigningPathInline (transfer flow)
   * so the popover surfaces per-hop balances. PathReviewPopover and
   * SigningPathControl render structure-only views and omit it.
   */
  getBalance?: (accountId: AccountId) => BN | string | null;
  asset?: Asset;
  errorAccountIds?: ReadonlySet<AccountId>;
};

/**
 * Inner content of the signing-path overview popover. Shared by
 * PathReviewPopover, SigningPathControl and SigningPathInline so the structure
 * (header + numbered hop list) is defined once.
 */
export const PathOverviewBody = ({ path, views, getBalance, asset, errorAccountIds }: Props) => {
  const { t } = useI18n();

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
          const balanceValue = getBalance ? getBalance(node.accountId) : null;
          const hasError = errorAccountIds?.has(node.accountId) ?? false;

          return (
            <div key={`${idx}-${node.kind}-${node.accountId}`} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-container-border bg-white">
                  <CaptionText className="text-text-secondary">{idx + 1}</CaptionText>
                </div>
                {!isLast && <div className="h-8 w-px bg-shade-12" />}
              </div>
              <div className="flex min-w-0 flex-1 flex-col pb-4">
                <CaptionText className="flex min-w-0 items-baseline gap-1 truncate text-text-tertiary">
                  <span className="truncate uppercase">{v.label}</span>
                  {v.connectionType && (
                    <>
                      <span className="text-text-tertiary" aria-hidden>
                        ·
                      </span>
                      <span className="truncate text-icon-accent normal-case">{v.connectionType}</span>
                    </>
                  )}
                </CaptionText>
                <div className="mt-1 flex min-w-0 items-center gap-2">
                  {v.address && (
                    <WalletAccountIcon
                      address={toAddress(v.address)}
                      type={v.walletType ?? null}
                      size={22}
                      iconSize={10}
                    />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <FootnoteText className="truncate text-text-primary">{v.title}</FootnoteText>
                    <HelpText className="truncate text-text-tertiary">{v.subtitle}</HelpText>
                  </div>
                  {balanceValue && asset && (
                    <AssetBalance
                      value={balanceValue}
                      asset={asset}
                      className={cnTw('text-footnote', hasError ? 'text-text-negative' : 'text-text-secondary')}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

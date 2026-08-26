import { type BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { useMemo, useState } from 'react';

import { type Asset, type ChainId, WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, performSearch, toAddress } from '@/shared/lib/utils';
import { BodyText, FootnoteText, HelpText, Icon } from '@/shared/ui';
import { WalletAccountIcon } from '@/shared/ui-entities';
import { Select } from '@/shared/ui-kit';
import { networkModel } from '@/entities/network';
import { sourceToNode } from '../lib/source-node';
import { type PathNextOption, type PathSource, type PathSourceKind, graphModel } from '../model/graph-model';
import { pathModel } from '../model/path-model';

import { NextOptionRow } from './NextOptionRow';
import { PathBreadcrumb } from './PathBreadcrumb';
import { SectionCard } from './SectionCard';

const SOURCE_PRESENTATION: Record<
  PathSourceKind,
  { walletType: WalletType; group: string; label: string; chip: string }
> = {
  proxied: {
    walletType: WalletType.POLKADOT_VAULT,
    group: 'signingPath.proxiedAccountsGroup',
    label: 'signingPath.label.proxied',
    chip: 'border-icon-accent/30 bg-icon-accent/8 text-icon-accent',
  },
  multisig: {
    walletType: WalletType.MULTISIG,
    group: 'signingPath.multisigsGroup',
    label: 'signingPath.label.multisig',
    chip: 'bg-shade-4 border-shade-12 text-text-tertiary',
  },
  signer: {
    walletType: WalletType.POLKADOT_VAULT,
    group: 'signingPath.ownAccountsGroup',
    label: 'signingPath.label.account',
    chip: 'bg-shade-4 border-shade-12 text-text-tertiary',
  },
};

type Props = {
  chainId: ChainId;
  sources?: PathSource[];
  filterNextOption?: (option: PathNextOption) => boolean;
  lockedSourceCount?: number;
  restrictToOwnAccounts?: boolean;
  /**
   * Also offer the user's own plain signing keys as sources — see
   * `GraphOptions`.
   */
  includeOwnSigners?: boolean;
  allowedProxyTypes?: readonly string[];
  disabledProxyReason?: string;
  /**
   * Optional balance lookup for signer options. When provided alongside
   * `optionAsset`, signer rows show the candidate signer's transferable balance
   * — useful so the user picks an initiator who can actually pay.
   */
  getOptionBalance?: (option: PathNextOption) => BN | string | null;
  optionAsset?: Asset;
  /**
   * Override the wrapper's classes. Tailwind-merge resolves conflicts, so
   * passing `min-h-[360px]` shrinks the default 520px floor — useful when the
   * StepPath sits in a "fit" modal that should not pad to the legacy height.
   */
  className?: string;
};

export const StepPath = ({
  chainId,
  sources: externalSources,
  filterNextOption,
  lockedSourceCount = 0,
  restrictToOwnAccounts = false,
  includeOwnSigners = false,
  allowedProxyTypes,
  disabledProxyReason,
  getOptionBalance,
  optionAsset,
  className,
}: Props) => {
  const { t } = useI18n();

  const path = useUnit(pathModel.$path);
  const isComplete = useUnit(pathModel.$isComplete);
  const lastNode = useUnit(pathModel.$lastNode);
  const chains = useUnit(networkModel.$chains);
  const addressPrefix = chains[chainId]?.addressPrefix;

  const [sourceQuery, setSourceQuery] = useState('');

  const sourcesStore = useMemo(
    () =>
      graphModel.$sourcesFor(chainId, { restrictToOwn: restrictToOwnAccounts, includeOwnSigners, allowedProxyTypes }),
    [chainId, restrictToOwnAccounts, includeOwnSigners, allowedProxyTypes],
  );
  const internalSources = useUnit(sourcesStore);
  const sources = externalSources ?? internalSources;

  const searchableSources = useMemo(
    () => sources.map((s) => ({ ...s, address: toAddress(s.accountId, { prefix: addressPrefix }) })),
    [sources, addressPrefix],
  );
  const filteredSources = useMemo(
    () =>
      performSearch({
        records: searchableSources,
        query: sourceQuery,
        weights: { name: 1, address: 0.5 },
      }),
    [searchableSources, sourceQuery],
  );

  const nextOptionsStore = useMemo(
    () =>
      lastNode
        ? graphModel.$nextOptionsForNode(lastNode, chainId, {
            restrictToOwn: restrictToOwnAccounts,
            allowedProxyTypes,
            disabledProxyReason,
          })
        : graphModel.$empty,
    [lastNode, chainId, restrictToOwnAccounts, allowedProxyTypes, disabledProxyReason],
  );
  const allNextOptions = useUnit(nextOptionsStore);
  const nextOptions = useMemo(
    () => (filterNextOption ? allNextOptions.filter(filterNextOption) : allNextOptions),
    [allNextOptions, filterNextOption],
  );

  const selectedSourceId = path.length > 0 ? path[0]!.accountId : null;

  const handleSourceChange = (accountId: string | null) => {
    if (!accountId) return;
    const source = sources.find((s) => s.accountId === accountId);
    if (!source) return;

    pathModel.pathReset();
    pathModel.pathNodeAppended(sourceToNode(source));
  };

  const getPickerTitle = (): string => {
    if (!lastNode) return '';
    if (lastNode.kind === 'proxied') return t('signingPath.pickMultisigForProxy');
    if (lastNode.kind === 'multisig') {
      const hasNested = nextOptions.some((opt) => opt.kind === 'multisig');
      return hasNested ? t('signingPath.pickInitiatorOrNested') : t('signingPath.pickInitiator');
    }
    return '';
  };

  const pickerTitle = getPickerTitle();

  const handleBreadcrumbClick = (i: number) => {
    if (i < lockedSourceCount) return;
    pathModel.pathTruncatedTo(i - 1);
  };

  return (
    <div className={cnTw('flex min-h-[520px] flex-col gap-y-4', className)}>
      {path.length > 0 && <PathBreadcrumb path={path} chainId={chainId} onNodeClick={handleBreadcrumbClick} />}

      {path.length === 0 && lockedSourceCount === 0 ? (
        <SectionCard
          number={1}
          title={t('signingPath.sourceAccount')}
          description={t('signingPath.sourceAccountDescription')}
        >
          <Select
            placeholder={t('signingPath.selectSource')}
            value={selectedSourceId}
            onChange={handleSourceChange}
            onSearch={setSourceQuery}
          >
            {filteredSources.map((source) => {
              const presentation = SOURCE_PRESENTATION[source.kind];
              const walletType = source.walletType ?? presentation.walletType;

              return (
                <Select.Item key={source.accountId} value={source.accountId}>
                  <span className="flex w-full min-w-0 items-center gap-x-2 overflow-hidden">
                    <WalletAccountIcon address={source.address} type={walletType} size={24} iconSize={12} />
                    <span className="flex min-w-0 flex-1 flex-col overflow-hidden">
                      <FootnoteText className="w-fit max-w-full truncate text-text-primary">{source.name}</FootnoteText>
                      <HelpText className="truncate text-text-tertiary">{t(presentation.group)}</HelpText>
                    </span>
                    <span
                      className={cnTw('shrink-0 rounded-full border px-2 py-0.5 text-help-text', presentation.chip)}
                    >
                      {t(presentation.label)}
                    </span>
                  </span>
                </Select.Item>
              );
            })}
          </Select>
        </SectionCard>
      ) : isComplete ? (
        <div className="flex items-center gap-3 rounded-lg border border-text-positive/30 bg-text-positive/8 p-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-text-positive">
            <Icon name="checkmark" size={16} className="text-white" />
          </div>
          <div className="flex flex-col gap-y-0.5">
            <BodyText className="text-text-primary">{t('signingPath.pathComplete')}</BodyText>
            <HelpText className="text-text-secondary">{t('signingPath.pathCompleteHint')}</HelpText>
          </div>
        </div>
      ) : (
        lastNode &&
        lastNode.kind !== 'signer' && (
          <SectionCard number={path.length + 1} title={pickerTitle}>
            <div className="flex flex-col gap-y-1.5">
              {nextOptions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-shade-12 px-3 py-4 text-center">
                  <FootnoteText className="text-text-tertiary">{t('signingPath.noOptions')}</FootnoteText>
                </div>
              ) : (
                nextOptions.map((opt, idx) => {
                  const optionBalance =
                    opt.kind === 'signer' && optionAsset && getOptionBalance ? getOptionBalance(opt) : null;
                  return (
                    <NextOptionRow
                      key={`${opt.kind}-${opt.accountId}-${opt.kind === 'multisig' ? (opt.proxyType ?? '') : ''}-${idx}`}
                      option={opt}
                      selected={false}
                      addressPrefix={addressPrefix}
                      balance={optionBalance && optionAsset ? { value: optionBalance, asset: optionAsset } : undefined}
                      onClick={() => {
                        if (opt.proxyType && lastNode?.kind === 'proxied') {
                          pathModel.pathSourceProxyTypeSet(opt.proxyType);
                        }
                        pathModel.pathNodeAppended({ kind: opt.kind, accountId: opt.accountId });
                      }}
                    />
                  );
                })
              )}
            </div>
          </SectionCard>
        )
      )}
    </div>
  );
};

import { useUnit } from 'effector-react';
import { useMemo, useState } from 'react';

import { type ChainId, WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, performSearch, toAddress } from '@/shared/lib/utils';
import { BodyText, FootnoteText, HelpText, Icon } from '@/shared/ui';
import { WalletAccountIcon } from '@/shared/ui-entities';
import { Select } from '@/shared/ui-kit';
import { type PathSource, graphModel } from '../model/graph-model';
import { pathModel } from '../model/path-model';

import { NextOptionRow } from './NextOptionRow';
import { PathBreadcrumb } from './PathBreadcrumb';
import { SectionCard } from './SectionCard';

type Props = {
  chainId: ChainId;
  sources?: PathSource[];
  lockedSourceCount?: number;
  restrictToOwnAccounts?: boolean;
  allowedProxyTypes?: readonly string[];
  disabledProxyReason?: string;
};

export const StepPath = ({
  chainId,
  sources: externalSources,
  lockedSourceCount = 0,
  restrictToOwnAccounts = false,
  allowedProxyTypes,
  disabledProxyReason,
}: Props) => {
  const { t } = useI18n();

  const path = useUnit(pathModel.$path);
  const isComplete = useUnit(pathModel.$isComplete);
  const lastNode = useUnit(pathModel.$lastNode);

  const [autoOpenSource, setAutoOpenSource] = useState(false);
  const [sourceQuery, setSourceQuery] = useState('');

  const sourcesStore = useMemo(
    () => graphModel.$sourcesFor(chainId, { restrictToOwn: restrictToOwnAccounts, allowedProxyTypes }),
    [chainId, restrictToOwnAccounts, allowedProxyTypes],
  );
  const internalSources = useUnit(sourcesStore);
  const sources = externalSources ?? internalSources;

  const searchableSources = useMemo(() => sources.map((s) => ({ ...s, address: toAddress(s.accountId) })), [sources]);
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
  const nextOptions = useUnit(nextOptionsStore);

  const selectedSourceId = path.length > 0 ? path[0]!.accountId : null;

  const handleSourceChange = (accountId: string | null) => {
    if (!accountId) return;
    const source = sources.find((s) => s.accountId === accountId);
    if (!source) return;

    pathModel.pathReset();
    pathModel.pathNodeAppended({
      kind: source.isProxy ? 'proxied' : 'multisig',
      accountId: source.accountId,
    });
  };

  const getPickerTitle = (): { title: string; description?: string } => {
    if (!lastNode) return { title: '' };

    if (lastNode.kind === 'proxied') {
      return {
        title: t('signingPath.pickMultisigForProxy'),
      };
    }

    if (lastNode.kind === 'multisig') {
      const hasNested = nextOptions.some((opt) => opt.kind === 'multisig');

      return {
        title: hasNested ? t('signingPath.pickInitiatorOrNested') : t('signingPath.pickInitiator'),
      };
    }

    return { title: '' };
  };

  const pickerInfo = getPickerTitle();

  const handleBreadcrumbClick = (i: number) => {
    if (i < lockedSourceCount) return;
    if (i === 0) setAutoOpenSource(true);
    pathModel.pathTruncatedTo(i - 1);
  };

  return (
    <div className="flex min-h-[520px] flex-col gap-y-4">
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
            defaultOpen={autoOpenSource}
            onChange={handleSourceChange}
            onSearch={setSourceQuery}
          >
            {filteredSources.map((source) => {
              const walletType =
                source.walletType ?? (source.isProxy ? WalletType.POLKADOT_VAULT : WalletType.MULTISIG);

              return (
                <Select.Item key={source.accountId} value={source.accountId}>
                  <span className="flex w-full min-w-0 items-center gap-x-2 overflow-hidden">
                    <WalletAccountIcon address={source.address} type={walletType} size={24} iconSize={12} />
                    <span className="flex min-w-0 flex-1 flex-col overflow-hidden">
                      <FootnoteText className="w-fit max-w-full truncate text-text-primary">{source.name}</FootnoteText>
                      <HelpText className="truncate text-text-tertiary">
                        {source.isProxy ? t('signingPath.proxiedAccountsGroup') : t('signingPath.multisigsGroup')}
                      </HelpText>
                    </span>
                    <span
                      className={cnTw(
                        'shrink-0 rounded-full border px-2 py-0.5 text-help-text',
                        source.isProxy
                          ? 'border-icon-accent/30 bg-icon-accent/8 text-icon-accent'
                          : 'bg-shade-4 border-shade-12 text-text-tertiary',
                      )}
                    >
                      {source.isProxy ? t('signingPath.label.proxied') : t('signingPath.label.multisig')}
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
          <SectionCard number={path.length + 1} title={pickerInfo.title} description={pickerInfo.description}>
            <div className="flex flex-col gap-y-1.5">
              {nextOptions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-shade-12 px-3 py-4 text-center">
                  <FootnoteText className="text-text-tertiary">{t('signingPath.noOptions')}</FootnoteText>
                </div>
              ) : (
                nextOptions.map((opt, idx) => (
                  <NextOptionRow
                    key={`${opt.kind}-${opt.accountId}-${opt.kind === 'multisig' ? (opt.proxyType ?? '') : ''}-${idx}`}
                    option={opt}
                    selected={false}
                    onClick={() => {
                      if (opt.kind === 'multisig' && opt.proxyType && lastNode?.kind === 'proxied') {
                        pathModel.pathSourceProxyTypeSet(opt.proxyType);
                      }
                      pathModel.pathNodeAppended({ kind: opt.kind, accountId: opt.accountId });
                    }}
                  />
                ))
              )}
            </div>
          </SectionCard>
        )
      )}
    </div>
  );
};

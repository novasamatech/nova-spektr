import { useUnit } from 'effector-react';
import { useMemo, useState } from 'react';

import { type ChainId, WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { BodyText, FootnoteText, HelpText, Icon } from '@/shared/ui';
import { WalletAccountIcon } from '@/shared/ui-entities';
import { Select } from '@/shared/ui-kit';
import { graphModel } from '../model/graph-model';
import { pathModel } from '../model/path-model';

import { NextOptionRow } from './NextOptionRow';
import { PathBreadcrumb } from './PathBreadcrumb';
import { SectionCard } from './SectionCard';

type Props = {
  chainId: ChainId;
  /**
   * When > 0, the first N nodes of the path are treated as fixed: the source
   * dropdown is hidden and clicks on those breadcrumb cards do not truncate the
   * path. Use when the consumer pre-seeds the path (e.g. edit flexible multisig
   * knows its proxy + multisig up front).
   */
  lockedSourceCount?: number;
  /**
   * Restrict the picker to paths that terminate at one of the user's own
   * signing accounts. Use for "I'm signing this myself" flows (e.g. edit
   * flexible multisig). Leave off for proposal flows where someone else may
   * sign (e.g. drafts) — those want to see the full graph.
   */
  restrictToOwnAccounts?: boolean;
  /**
   * Whitelist of proxy types that can perform the operation being built.
   * Delegates with a non-matching proxyType still appear in the picker, but
   * disabled with a tooltip — users see they exist and learn why they can't
   * pick them. Example: edit-flexible-multisig builds `proxy.addProxy`, which
   * only "Any" allows.
   */
  allowedProxyTypes?: readonly string[];
  /**
   * Tooltip copy attached to disabled options when their proxyType is outside
   * `allowedProxyTypes`.
   */
  disabledProxyReason?: string;
};

export const StepPath = ({
  chainId,
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

  const sourcesStore = useMemo(
    () => graphModel.$sourcesFor(chainId, { restrictToOwn: restrictToOwnAccounts, allowedProxyTypes }),
    [chainId, restrictToOwnAccounts, allowedProxyTypes],
  );
  const sources = useUnit(sourcesStore);

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
          >
            {sources.map((source) => {
              const address = toAddress(source.accountId);
              const walletType =
                source.walletType ?? (source.isProxy ? WalletType.POLKADOT_VAULT : WalletType.MULTISIG);

              return (
                <Select.Item key={source.accountId} value={source.accountId}>
                  <span className="flex w-full min-w-0 items-center gap-x-2 overflow-hidden">
                    <WalletAccountIcon address={address} type={walletType} size={24} iconSize={12} />
                    <span className="flex w-full flex-col overflow-hidden">
                      <FootnoteText className="w-fit max-w-full truncate text-text-primary">{source.name}</FootnoteText>
                      <HelpText className="truncate text-text-tertiary">
                        {source.isProxy ? t('signingPath.proxiedAccountsGroup') : t('signingPath.multisigsGroup')}
                      </HelpText>
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

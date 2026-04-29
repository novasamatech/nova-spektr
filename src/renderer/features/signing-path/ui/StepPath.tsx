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
};

export const StepPath = ({ chainId }: Props) => {
  const { t } = useI18n();

  const path = useUnit(pathModel.$path);
  const isComplete = useUnit(pathModel.$isComplete);
  const lastNode = useUnit(pathModel.$lastNode);

  const [autoOpenSource, setAutoOpenSource] = useState(false);

  const sourcesStore = useMemo(() => graphModel.$sourcesFor(chainId), [chainId]);
  const sources = useUnit(sourcesStore);

  const nextOptionsStore = useMemo(
    () => (lastNode ? graphModel.$nextOptionsForNode(lastNode, chainId) : graphModel.$empty),
    [lastNode, chainId],
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
        title: t('operations.drafts.signingPath.pickMultisigForProxy'),
      };
    }

    if (lastNode.kind === 'multisig') {
      const hasNested = nextOptions.some((opt) => opt.kind === 'multisig');

      return {
        title: hasNested
          ? t('operations.drafts.signingPath.pickInitiatorOrNested')
          : t('operations.drafts.signingPath.pickInitiator'),
      };
    }

    return { title: '' };
  };

  const pickerInfo = getPickerTitle();

  return (
    <div className="flex min-h-[520px] flex-col gap-y-4">
      {path.length > 0 && (
        <PathBreadcrumb
          path={path}
          onNodeClick={(i) => {
            if (i === 0) setAutoOpenSource(true);
            pathModel.pathTruncatedTo(i - 1);
          }}
        />
      )}

      {path.length === 0 ? (
        <SectionCard
          number={1}
          title={t('operations.drafts.signingPath.sourceAccount')}
          description={t('operations.drafts.signingPath.sourceAccountDescription')}
        >
          <Select
            placeholder={t('operations.drafts.signingPath.selectSource')}
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
                        {source.isProxy
                          ? t('operations.drafts.proxiedAccountsGroup')
                          : t('operations.drafts.multisigsGroup')}
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
            <BodyText className="text-text-primary">{t('operations.drafts.signingPath.pathComplete')}</BodyText>
            <HelpText className="text-text-secondary">{t('operations.drafts.signingPath.pathCompleteHint')}</HelpText>
          </div>
        </div>
      ) : (
        lastNode &&
        lastNode.kind !== 'signer' && (
          <SectionCard number={path.length + 1} title={pickerInfo.title} description={pickerInfo.description}>
            <div className="flex flex-col gap-y-1.5">
              {nextOptions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-shade-12 px-3 py-4 text-center">
                  <FootnoteText className="text-text-tertiary">
                    {t('operations.drafts.signingPath.noOptions')}
                  </FootnoteText>
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

import { useUnit } from 'effector-react';

import { type WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { CaptionText, FootnoteText, HelpText, Icon } from '@/shared/ui';
import { WalletAccountIcon } from '@/shared/ui-entities';
import { Popover } from '@/shared/ui-kit';
import { type PathNode } from '@/domains/backend';
import { graphModel } from '../../model/graph-model';

import { nodeView } from './path-views';

type Props = {
  path: PathNode[];
};

export const PathReviewPopover = ({ path }: Props) => {
  const { t } = useI18n();
  const nameByAccountId = useUnit(graphModel.$contactNameByAccountId);

  return (
    <Popover>
      <Popover.Trigger>
        <button
          type="button"
          className="flex cursor-pointer items-center gap-1.5 rounded-full border border-container-border bg-white px-2.5 py-1 transition-colors hover:bg-action-background-hover"
        >
          <Icon name="details" size={12} className="text-icon-accent" />
          <CaptionText className="text-icon-accent uppercase">
            {t('operations.drafts.signingPath.openOverview')}
          </CaptionText>
        </button>
      </Popover.Trigger>
      <Popover.Content>
        <div className="flex w-[340px] flex-col gap-y-3 p-4">
          <div className="flex items-center justify-between">
            <CaptionText className="text-text-tertiary uppercase">
              {t('operations.drafts.signingPath.fullSigningPath')}
            </CaptionText>
            <HelpText className="text-text-tertiary">
              {t('operations.drafts.signingPath.hopsCount', { count: path.length })}
            </HelpText>
          </div>
          <div className="flex flex-col">
            {path.map((node, idx) => {
              const v = nodeView(node, nameByAccountId, idx);
              if (!v) return null;
              const isLast = idx === path.length - 1;

              return (
                <div key={`ov-${idx}-${node.kind}-${node.accountId}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-container-border bg-white">
                      <CaptionText className="text-text-secondary">{idx + 1}</CaptionText>
                    </div>
                    {!isLast && <div className="h-8 w-px bg-shade-12" />}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col pb-4">
                    <CaptionText className="text-text-tertiary uppercase">{v.label}</CaptionText>
                    <div className="mt-1 flex min-w-0 items-center gap-2">
                      {v.address && (
                        <WalletAccountIcon
                          address={toAddress(v.address)}
                          type={(v.walletType ?? 'Multisig') as WalletType}
                          size={22}
                          iconSize={10}
                        />
                      )}
                      <div className="flex min-w-0 flex-col">
                        <FootnoteText className="truncate text-text-primary">{v.title}</FootnoteText>
                        <HelpText className="truncate text-text-tertiary">{v.subtitle}</HelpText>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Popover.Content>
    </Popover>
  );
};

import { useUnit } from 'effector-react';
import { useCallback } from 'react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Popover } from '@/shared/ui-kit';
import { type PathNode } from '@/domains/backend';
import { networkModel } from '@/entities/network';
import { graphModel } from '../model/graph-model';

import { PathChip } from './PathChip';
import { PathOverviewBody } from './PathOverviewBody';
import { nodeView } from './path-views';

type Props = {
  path: PathNode[];
  chainId: ChainId;
};

export const PathReviewPopover = ({ path, chainId }: Props) => {
  const { t } = useI18n();
  const resolveName = useUnit(graphModel.$nameResolver);
  const chains = useUnit(networkModel.$chains);
  const addressPrefix = chains[chainId]?.addressPrefix;
  const boundResolve = useCallback((accountId: AccountId) => resolveName(accountId, chainId), [resolveName, chainId]);

  const views = path
    .map((node, i) => nodeView(node, boundResolve, i, t, addressPrefix))
    .filter((v): v is NonNullable<typeof v> => v !== null);

  return (
    <Popover enableHover side="bottom" align="start">
      <Popover.Trigger>
        <PathChip />
      </Popover.Trigger>
      <Popover.Content>
        <PathOverviewBody path={path} views={views} />
      </Popover.Content>
    </Popover>
  );
};

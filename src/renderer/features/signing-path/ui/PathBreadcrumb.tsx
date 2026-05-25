import { useUnit } from 'effector-react';
import { type ReactNode, useCallback } from 'react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type PathNode } from '@/domains/backend';
import { networkModel } from '@/entities/network';
import { graphModel } from '../model/graph-model';

import { EllipsisCard } from './EllipsisCard';
import { PathArrow } from './PathArrow';
import { PathCard } from './PathCard';
import { PathHopRow } from './PathHopRow';
import { type PathCardSize, type PathNodeView, enrichConnectionEdge, nodeView } from './path-views';

type Props = {
  path: PathNode[];
  chainId: ChainId;
  size?: PathCardSize;
  onNodeClick?: (index: number) => void;
  /**
   * `'auto'` switches to a vertical, full-width hop list once the path has 3+
   * hops, where horizontal cards would otherwise squeeze wallet names down to a
   * few characters. Defaults to `'horizontal'` so the path builder keeps its
   * left-to-right card flow.
   */
  orientation?: 'horizontal' | 'auto';
};

const MAX_VISIBLE = 3;
const VERTICAL_THRESHOLD = 3;

const buildBreadcrumbElements = (
  views: PathNodeView[],
  size: PathCardSize,
  onNodeClick?: (index: number) => void,
): ReactNode[] => {
  if (views.length <= MAX_VISIBLE) {
    return views.flatMap((v, i) => {
      const arrow: ReactNode[] = i > 0 ? [<PathArrow key={`arrow-${i}`} />] : [];

      return [
        ...arrow,
        <PathCard
          key={`card-${i}`}
          view={v}
          size={size}
          position={i}
          onClick={onNodeClick ? () => onNodeClick(i) : undefined}
        />,
      ];
    });
  }

  const first = views[0];
  const hidden = views.slice(1, views.length - 1);
  const last = views[views.length - 1];
  const elements: ReactNode[] = [];

  if (first) {
    elements.push(
      <PathCard
        key="card-first"
        view={first}
        size={size}
        position={0}
        onClick={onNodeClick ? () => onNodeClick(0) : undefined}
      />,
    );
  }
  elements.push(<PathArrow key="arrow-first" />);
  elements.push(<EllipsisCard key="ellipsis" hiddenViews={hidden} size={size} />);
  elements.push(<PathArrow key="arrow-last" />);
  if (last) {
    elements.push(
      <PathCard
        key="card-last"
        view={last}
        size={size}
        position={views.length - 1}
        onClick={onNodeClick ? () => onNodeClick(views.length - 1) : undefined}
      />,
    );
  }

  return elements;
};

export const PathBreadcrumb = ({ path, chainId, size = 'sm', onNodeClick, orientation = 'horizontal' }: Props) => {
  const { t } = useI18n();
  const resolveName = useUnit(graphModel.$nameResolver);
  const chains = useUnit(networkModel.$chains);
  const addressPrefix = chains[chainId]?.addressPrefix;
  const boundResolve = useCallback((accountId: AccountId) => resolveName(accountId, chainId), [resolveName, chainId]);

  const rawViews = path
    .map((node, i) => nodeView(node, boundResolve, i, t, addressPrefix))
    .filter((v): v is NonNullable<typeof v> => v !== null);
  const views = enrichConnectionEdge(rawViews, path, t);

  if (views.length === 0) {
    return null;
  }

  if (orientation === 'auto' && views.length >= VERTICAL_THRESHOLD) {
    return (
      <div className="flex flex-col rounded-lg bg-block-background-default p-3">
        {views.map((view, i) => (
          <PathHopRow key={`hop-${i}-${view.label}`} view={view} index={i} isLast={i === views.length - 1} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-stretch gap-2 rounded-lg bg-block-background-default">
      {buildBreadcrumbElements(views, size, onNodeClick)}
    </div>
  );
};

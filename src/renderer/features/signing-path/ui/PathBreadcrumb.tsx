import { useUnit } from 'effector-react';
import { type ReactNode, useCallback } from 'react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type PathNode } from '@/domains/backend';
import { graphModel } from '../model/graph-model';

import { EllipsisCard } from './EllipsisCard';
import { PathArrow } from './PathArrow';
import { PathCard } from './PathCard';
import { type PathCardSize, type PathNodeView, nodeView } from './path-views';

type Props = {
  path: PathNode[];
  chainId: ChainId;
  size?: PathCardSize;
  onNodeClick?: (index: number) => void;
};

const MAX_VISIBLE = 3;

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

export const PathBreadcrumb = ({ path, chainId, size = 'sm', onNodeClick }: Props) => {
  const { t } = useI18n();
  const resolveName = useUnit(graphModel.$nameResolver);
  const boundResolve = useCallback((accountId: AccountId) => resolveName(accountId, chainId), [resolveName, chainId]);

  const views = path
    .map((node, i) => nodeView(node, boundResolve, i, t))
    .filter((v): v is NonNullable<typeof v> => v !== null);

  if (views.length === 0) {
    return null;
  }

  return (
    <div className="flex items-stretch gap-2 rounded-lg bg-block-background-default">
      {buildBreadcrumbElements(views, size, onNodeClick)}
    </div>
  );
};

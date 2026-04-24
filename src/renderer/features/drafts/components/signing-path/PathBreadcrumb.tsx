import { useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { type PathNode } from '@/domains/backend';
import { graphModel } from '../../model/graph-model';

import { EllipsisCard } from './EllipsisCard';
import { PathArrow } from './PathArrow';
import { PathCard } from './PathCard';
import { type PathCardSize, type PathNodeView, nodeView } from './path-views';

type Props = {
  path: PathNode[];
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

export const PathBreadcrumb = ({ path, size = 'sm', onNodeClick }: Props) => {
  const nameByAccountId = useUnit(graphModel.$contactNameByAccountId);

  const views = path
    .map((node, i) => nodeView(node, nameByAccountId, i))
    .filter((v): v is NonNullable<typeof v> => v !== null);

  if (views.length === 0) {
    return null;
  }

  return (
    <div className="flex items-stretch gap-2 rounded-lg bg-block-background-default p-3">
      {buildBreadcrumbElements(views, size, onNodeClick)}
    </div>
  );
};

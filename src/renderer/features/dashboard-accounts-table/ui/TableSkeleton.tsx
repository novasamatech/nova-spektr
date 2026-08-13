import { cnTw } from '@/shared/lib/utils';
import { Skeleton } from '@/shared/ui-kit';

import { GRID_TEMPLATE, NUMERIC_COLUMNS } from './tableLayout';

const GROUP_COUNT = 4;
const ROWS_PER_GROUP = 3;

const NUMERIC_WIDTH: Record<(typeof NUMERIC_COLUMNS)[number], string> = {
  transferable: '64px',
  staked: '52px',
  governance: '52px',
  other: '64px',
  total: '72px',
};

const GroupHeaderStub = () => (
  <div className="flex h-12 items-center gap-x-2 bg-block-background px-4">
    <Skeleton width="12px" height="12px" />
    <Skeleton circle width="24px" />
    <Skeleton width="120px" height="14px" />
    <div className="flex-1" />
    <Skeleton width="72px" height="14px" />
  </div>
);

const RowStub = () => (
  <div className={cnTw(GRID_TEMPLATE, 'min-h-12 border-b border-divider')}>
    <div className="flex items-center gap-x-2 pl-[18px]">
      <Skeleton circle width="16px" />
      <Skeleton width="72px" height="14px" />
    </div>

    <Skeleton width="88px" height="14px" />

    {NUMERIC_COLUMNS.map((key) => (
      <div key={key} className="flex justify-end">
        <Skeleton width={NUMERIC_WIDTH[key]} height="14px" />
      </div>
    ))}
  </div>
);

export const TableSkeleton = () => (
  <div>
    {Array.from({ length: GROUP_COUNT }, (_, groupIndex) => (
      <div key={`group-${groupIndex}`}>
        <GroupHeaderStub />
        {Array.from({ length: ROWS_PER_GROUP }, (_, rowIndex) => (
          <RowStub key={`group-${groupIndex}-row-${rowIndex}`} />
        ))}
      </div>
    ))}
  </div>
);

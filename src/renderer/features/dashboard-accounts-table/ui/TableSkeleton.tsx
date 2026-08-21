import { cnTw } from '@/shared/lib/utils';
import { Skeleton } from '@/shared/ui-kit';

import {
  GRID_TEMPLATE,
  GROUP_HEADER_CLASS,
  GROUP_HEADER_SPAN_CLASS,
  NUMERIC_COLUMNS,
  ROW_CLASS,
  TOTAL_CELL_CLASS,
  WIDE_ONLY_CLASS,
} from './tableLayout';

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
  <div className={cnTw(GRID_TEMPLATE, GROUP_HEADER_CLASS)}>
    <div className={GROUP_HEADER_SPAN_CLASS}>
      <Skeleton width="12px" height="12px" />
      <Skeleton circle width="24px" />
      <Skeleton width="120px" height="14px" />
    </div>
    <div className={TOTAL_CELL_CLASS}>
      <Skeleton width="72px" height="14px" />
    </div>
  </div>
);

const RowStub = () => (
  <div className={cnTw(GRID_TEMPLATE, ROW_CLASS)}>
    {/* 18px = 12px caret glyph + 6px gap, so the chain icon lines up under the
        group header's caret column rather than the row's own left edge. */}
    <div className="flex items-center gap-x-2 pl-[18px]">
      <Skeleton circle width="16px" />
      <span className={WIDE_ONLY_CLASS}>
        <Skeleton width="72px" height="14px" />
      </span>
    </div>

    <span className={WIDE_ONLY_CLASS}>
      <Skeleton width="88px" height="14px" />
    </span>

    {NUMERIC_COLUMNS.map((key) => (
      <div key={key} className={key === 'total' ? cnTw(TOTAL_CELL_CLASS, 'justify-center') : 'flex justify-end'}>
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

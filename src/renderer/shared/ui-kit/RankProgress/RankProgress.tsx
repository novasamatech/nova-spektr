import { memo, useState } from 'react';

import { cnTw } from '@/shared/lib/utils';

type RankItem = {
  id: string;
  name: string;
  time: string;
  color: string;
  current?: boolean;
};

type Props = {
  ranks: RankItem[];
  currentRankId: string;
  title?: string;
  onRankClick?: (rankId: string) => void;
};

type RankPosition = {
  containerLeft: string;
  containerWidth: string;
  textWidth: string;
  textAlign: 'left' | 'center' | 'right';
};

const RANK_POSITIONS: RankPosition[] = [
  { containerLeft: '0px', containerWidth: '41px', textWidth: '41px', textAlign: 'left' },
  { containerLeft: '41px', containerWidth: '88px', textWidth: '80px', textAlign: 'center' },
  { containerLeft: '129px', containerWidth: '88px', textWidth: '80px', textAlign: 'center' },
  { containerLeft: '217px', containerWidth: '88px', textWidth: '80px', textAlign: 'center' },
  { containerLeft: '305px', containerWidth: '88px', textWidth: '80px', textAlign: 'center' },
  { containerLeft: '393px', containerWidth: '88px', textWidth: '80px', textAlign: 'center' },
  { containerLeft: '481px', containerWidth: '136px', textWidth: '80px', textAlign: 'center' },
  { containerLeft: '617px', containerWidth: '174px', textWidth: '80px', textAlign: 'center' },
  { containerLeft: '791px', containerWidth: '81px', textWidth: '80px', textAlign: 'right' },
];

export const RankProgress = memo(({ ranks, currentRankId, title, onRankClick }: Props) => {
  const currentIndex = ranks.findIndex(rank => rank.id === currentRankId);
  const [selectedRankId, setSelectedRankId] = useState<string | null>(null);

  const handleRankClick = (rankId: string) => {
    setSelectedRankId(rankId);
    onRankClick?.(rankId);
  };

  return (
    <div className="relative h-[120px] w-full max-w-[920px] overflow-hidden rounded-[8px] bg-white">
      {/* Title */}
      {title && (
        <p className="absolute top-[12px] left-[16px] font-manrope text-[17px] leading-[22px] font-extrabold tracking-[-0.013em] text-nowrap whitespace-pre text-[#363643]">
          {title}
        </p>
      )}

      {/* Time labels */}
      <div className="font-inter absolute top-[42px] left-[16px] h-[14px] w-[888px] text-[10px] leading-[14px] font-medium tracking-[-0.01em] not-italic">
        {[
          { index: 0, left: '0px', width: '16px', align: 'items-end' },
          { index: 1, left: '29px', width: '24px', align: 'items-end' },
          { index: 2, left: '117px', width: '24px', align: 'items-end' },
          { index: 3, left: '205px', width: '24px', align: 'items-end' },
          { index: 4, left: '293px', width: '24px', align: 'items-end' },
          { index: 5, left: '381px', width: '24px', align: 'items-end' },
          { index: 6, left: '469px', width: '24px', align: 'items-end' },
          { index: 7, left: '605px', width: '25px', align: 'items-end' },
          { index: 8, left: '778px', width: '26px', align: 'items-end' },
        ].map(({ index, left, width, align }) => {
          const hasSelection = selectedRankId !== null;
          const selectedIndex = ranks.findIndex(rank => rank.id === selectedRankId);
          const isSelectedBoundary = selectedIndex >= 0 && (index === selectedIndex || index === selectedIndex + 1);

          return (
            <div
              key={`time-${index}`}
              className={cnTw('absolute flex flex-col text-center', align, {
                'text-[#363643]': !hasSelection || isSelectedBoundary,
                'text-[#a4a4ad]': hasSelection && !isSelectedBoundary,
              })}
              style={{ left, top: '0px', width, height: '14px' }}
            >
              <p className="leading-[14px]">{ranks[index]?.time}</p>
            </div>
          );
        })}
        <div
          className={cnTw('absolute flex flex-col items-center text-center', {
            'text-[#363643]': !selectedRankId || selectedRankId === ranks[ranks.length - 1]?.id,
            'text-[#a4a4ad]': selectedRankId !== null && selectedRankId !== ranks[ranks.length - 1]?.id,
          })}
          style={{ left: '870px', top: '0px', width: '12px', height: '14px' }}
        >
          <p className="leading-[14px]">∞</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="absolute top-[60px] left-[16px] flex content-stretch items-center">
        {ranks.map((rank, index) => {
          const isLast = index === ranks.length - 1;
          const isActive = index <= currentIndex;
          const nextIsActive = index < currentIndex;
          const isPartialProgress = index === currentIndex && index < ranks.length - 1;
          const width = getSegmentWidth(index);
          const isSelected = selectedRankId === rank.id;
          const hasSelection = selectedRankId !== null;
          const selectedIndex = ranks.findIndex(r => r.id === selectedRankId);
          const isSelectedBoundary = hasSelection && (index === selectedIndex || index === selectedIndex + 1);

          return (
            <button
              key={`segment-${rank.id}`}
              type="button"
              className="relative flex shrink-0 cursor-pointer content-stretch items-end border-0 bg-transparent p-0 transition-opacity after:absolute after:top-0 after:left-0 after:h-[60px] after:w-full after:content-[''] hover:opacity-90"
              style={{ width }}
              onClick={() => handleRankClick(rank.id)}
            >
              <div
                className={cnTw('h-[12px] w-[2px] shrink-0 rounded-tl-[100px] rounded-tr-[100px]', {
                  'bg-[#363643]': !hasSelection ? isActive : isSelectedBoundary,
                  'bg-[#d7d7d9]': !hasSelection ? !isActive : !isSelectedBoundary,
                })}
              />

              {!isLast && (
                <div className="relative h-[8px] min-h-px min-w-px flex-1 shrink-0 grow basis-0 bg-tab-background">
                  {nextIsActive && !hasSelection && (
                    <div
                      className="absolute top-0 right-0 left-0 h-[8px]"
                      style={{
                        backgroundColor: rank.color,
                      }}
                    />
                  )}
                  {hasSelection && (nextIsActive || isSelected) && (
                    <div
                      className={cnTw('absolute top-0 right-0 left-0 h-[8px]', {
                        'opacity-30': !isSelected,
                      })}
                      style={{
                        backgroundColor: rank.color,
                      }}
                    />
                  )}
                  {hasSelection && isSelected && !nextIsActive && (
                    <div
                      className="absolute top-0 right-0 left-0 h-[8px]"
                      style={{
                        backgroundColor: rank.color,
                      }}
                    />
                  )}
                  {isPartialProgress && currentIndex >= 0 && !hasSelection && (
                    <div
                      className="absolute top-0 left-0 h-[8px] w-[40px]"
                      style={{
                        backgroundColor: ranks[currentIndex]?.color || '#cccccc',
                      }}
                    />
                  )}
                </div>
              )}

              {isLast && (
                <>
                  <div className="relative h-[8px] min-h-px min-w-px flex-1 shrink-0 grow basis-0 bg-tab-background">
                    {isActive && !hasSelection && (
                      <div
                        className="absolute top-0 right-0 left-0 h-[8px]"
                        style={{
                          backgroundColor: rank.color,
                        }}
                      />
                    )}
                    {hasSelection && (isActive || isSelected) && (
                      <div
                        className={cnTw('absolute top-0 right-0 left-0 h-[8px]', {
                          'opacity-30': !isSelected,
                        })}
                        style={{
                          backgroundColor: rank.color,
                        }}
                      />
                    )}
                    {hasSelection && isSelected && !isActive && (
                      <div
                        className="absolute top-0 right-0 left-0 h-[8px]"
                        style={{
                          backgroundColor: rank.color,
                        }}
                      />
                    )}
                  </div>
                  <div
                    className={cnTw('h-[12px] w-[2px] shrink-0 rounded-tl-[100px] rounded-tr-[100px]', {
                      'bg-[#363643]': !hasSelection ? isActive : isSelectedBoundary,
                      'bg-[#d7d7d9]': !hasSelection ? !isActive : !isSelectedBoundary,
                    })}
                  />
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Rank labels */}
      <div className="pointer-events-none absolute top-[80px] left-[16px] h-[28px] w-[888px]">
        {ranks.map((rank, index) => {
          const isCurrent = rank.id === currentRankId;
          const isSelected = selectedRankId === rank.id;
          const hasSelection = selectedRankId !== null;
          const position = RANK_POSITIONS[index];
          if (!position) return null;

          return (
            <div
              key={`label-${rank.id}`}
              className="absolute h-[28px]"
              style={{ left: position.containerLeft, width: position.containerWidth, top: 0 }}
            >
              <div
                className={cnTw(
                  'absolute flex h-full flex-col content-stretch items-center justify-center gap-[2px] text-center text-[10px] leading-[0] not-italic',
                  {
                    'text-[#01a63e]': isCurrent && !hasSelection,
                    'text-[#363643]':
                      (!hasSelection && !isCurrent && index <= currentIndex) || (hasSelection && isSelected),
                    'text-[#a4a4ad]':
                      (!hasSelection && !isCurrent && index > currentIndex) || (hasSelection && !isSelected),
                  },
                )}
                style={
                  position.textAlign === 'right'
                    ? { right: 0, width: position.textWidth }
                    : position.textAlign === 'left'
                      ? { left: 0, width: position.textWidth }
                      : { left: '50%', transform: 'translateX(-50%)', width: position.textWidth }
                }
              >
                <div className="font-inter relative flex w-full shrink-0 flex-col justify-end font-semibold tracking-[0.75px] uppercase">
                  <p className="leading-[12px]">RANK {rank.id}</p>
                </div>
                <div className="font-inter relative flex w-full shrink-0 flex-col justify-end font-medium tracking-[-0.1px]">
                  <p className="leading-[14px]">{rank.name}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

RankProgress.displayName = 'RankProgress';

function getSegmentWidth(index: number): string {
  const widths = ['40px', '88px', '88px', '88px', '88px', '88px', '136px', '176px', '81px'];
  return widths[index] || '88px';
}

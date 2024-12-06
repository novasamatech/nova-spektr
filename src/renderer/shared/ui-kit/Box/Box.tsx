import type * as CSS from 'csstype';
import { type PropsWithChildren, forwardRef, useMemo } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { gridSpaceConverter } from '../_helpers/gridSpaceConverter';

type BoxSpacing = number;

type BoxPadding =
  | BoxSpacing
  | [verticalTop: BoxSpacing, horizontalRight: BoxSpacing, bottom?: BoxSpacing, right?: BoxSpacing];

type BoxProps = PropsWithChildren<{
  width?: CSS.Property.Width;
  height?: CSS.Property.Height;
  verticalAlign?: CSS.Property.AlignItems;
  horizontalAlign?: CSS.Property.JustifyContent;
  direction?: CSS.Property.FlexDirection;
  shrink?: CSS.Property.FlexShrink;
  fitContainer?: boolean;
  fillContainer?: boolean;
  hideOverflow?: boolean;
  grow?: number;
  wrap?: boolean;
  gap?: BoxSpacing;
  padding?: BoxPadding;
  testId?: string;
}>;

const getBoxSize = <T extends string | number | void>(size: BoxSpacing | string | void): T => {
  if (typeof size === 'number') {
    return `${gridSpaceConverter(size)}px` as T;
  }

  return size as T;
};

/**
 * Basic building block for positioning elements on surface. Abstraction over
 * flexbox container.
 *
 * ```tsx
 * const Component = () => {
 *   return (
 *     <Surface>
 *       <Box direction="horizontal" gap={2} padding={4}>
 *         <Input />
 *         <Button />
 *         <Description />
 *       </Box>
 *     </Surface>
 *   );
 * };
 * ```
 */
export const Box = forwardRef<HTMLDivElement, BoxProps>(
  (
    {
      children,
      gap,
      wrap,
      padding,
      direction = 'column',
      shrink,
      grow,
      verticalAlign,
      horizontalAlign,
      fitContainer,
      fillContainer,
      hideOverflow,
      width,
      height,
      testId = 'Box',
    },
    ref,
  ) => {
    const calculatedPadding = useMemo(
      () => {
        return Array.isArray(padding)
          ? padding.map(getBoxSize<CSS.Property.Padding>).join(' ')
          : getBoxSize<CSS.Property.Padding>(padding);
      },
      Array.isArray(padding) ? padding : [padding],
    );

    const isHorizontal = direction === 'row' || direction === 'row-reverse';

    const style = useMemo<React.CSSProperties>(
      () => ({
        width,
        height,
        padding: calculatedPadding,
        alignItems: isHorizontal ? verticalAlign : horizontalAlign,
        justifyContent: isHorizontal ? horizontalAlign : verticalAlign,
        flexShrink: shrink,
        gap: getBoxSize<CSS.Property.Gap>(gap),
        flexGrow: grow,
      }),
      [isHorizontal, calculatedPadding, width, height, verticalAlign, horizontalAlign, gap],
    );

    return (
      <div
        ref={ref}
        className={cnTw('relative flex h-fit min-h-0 min-w-0', {
          'flex-col': direction === 'column',
          'flex-col-reverse': direction === 'column-reverse',
          'flex-row': direction === 'row',
          'flex-row-reverse': direction === 'row-reverse',
          'max-h-full w-full': fitContainer,
          'min-h-full min-w-full': fillContainer,
          'flex-wrap': wrap,
          'overflow-hidden': hideOverflow,
        })}
        style={style}
        data-testid={testId}
      >
        {children}
      </div>
    );
  },
);

Box.displayName = 'Box';

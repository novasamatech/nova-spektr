import type * as CSS from 'csstype';
import { type Property } from 'csstype';
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
      verticalAlign,
      horizontalAlign,
      fitContainer,
      width,
      height,
      testId = 'Box',
    },
    ref,
  ) => {
    const calculatedPadding = useMemo(
      () =>
        Array.isArray(padding)
          ? padding.map(getBoxSize<Property.Padding>).join(' ')
          : getBoxSize<Property.Padding>(padding),
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
        gap: getBoxSize<Property.Gap>(gap),
      }),
      [isHorizontal, calculatedPadding, width, height, verticalAlign, horizontalAlign, gap],
    );

    return (
      <div
        ref={ref}
        className={cnTw('flex h-fit min-h-0 w-fit min-w-0', {
          'flex-col': direction === 'column',
          'flex-col-reverse': direction === 'column-reverse',
          'flex-row': direction === 'row',
          'flex-row-reverse': direction === 'row-reverse',
          'max-h-full max-w-full': fitContainer,
          wrap: wrap,
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

import type * as CSS from 'csstype';
import { type PropsWithChildren, forwardRef, useMemo } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { gridSpaceConverter } from '../_helpers/gridSpaceConverter';

type SpacingUnit = number;

type BoxPadding =
  | SpacingUnit
  | [verticalTop: SpacingUnit, horizontalRight: SpacingUnit, bottom?: SpacingUnit, right?: SpacingUnit];

type BoxMargin = BoxPadding;

type BoxProps = PropsWithChildren<{
  width?: CSS.Property.Width | number;
  height?: CSS.Property.Height | number;
  verticalAlign?: CSS.Property.AlignItems;
  horizontalAlign?: CSS.Property.JustifyContent;
  direction?: CSS.Property.FlexDirection;
  shrink?: CSS.Property.FlexShrink;
  fitContainer?: boolean;
  fillContainer?: boolean;
  hideOverflow?: boolean;
  grow?: number;
  wrap?: boolean;
  gap?: SpacingUnit | string;
  padding?: BoxPadding;
  margin?: BoxMargin;
  testId?: string;
}>;

const getBoxSize = <T extends string | number | void>(size: SpacingUnit | string | void): T => {
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
      margin,
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

    const calculatedMargin = useMemo(
      () => {
        return Array.isArray(margin)
          ? margin.map(getBoxSize<CSS.Property.Margin>).join(' ')
          : getBoxSize<CSS.Property.Margin>(margin);
      },
      Array.isArray(margin) ? margin : [margin],
    );

    const isHorizontal = direction === 'row' || direction === 'row-reverse';

    const style = useMemo<React.CSSProperties>(
      () => ({
        width: getBoxSize<CSS.Property.Width>(width),
        height: getBoxSize<CSS.Property.Height>(height),
        padding: calculatedPadding,
        margin: calculatedMargin,
        alignItems: isHorizontal ? verticalAlign : horizontalAlign,
        justifyContent: isHorizontal ? horizontalAlign : verticalAlign,
        flexShrink: shrink,
        gap: getBoxSize<CSS.Property.Gap>(gap),
        flexGrow: grow,
      }),
      [isHorizontal, calculatedPadding, calculatedMargin, width, height, verticalAlign, horizontalAlign, gap],
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

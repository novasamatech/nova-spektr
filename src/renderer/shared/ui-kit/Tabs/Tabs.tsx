import * as RadixTabs from '@radix-ui/react-tabs';
import { Children, type PropsWithChildren, cloneElement, isValidElement } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { Carousel } from '../Carousel/Carousel';

type RootProps = PropsWithChildren<{
  value: string;
  onChange: (value: string) => unknown;
}>;

const Root = ({ value, onChange, children }: RootProps) => {
  const indexedChildren = Children.map(children, (child, index) =>
    // @ts-expect-error __index field is not typed
    isValidElement(child) ? cloneElement(child, { __index: index }) : null,
  );

  return (
    <RadixTabs.Root value={value} asChild onValueChange={onChange}>
      <Carousel item={value} fixedHeight>
        {indexedChildren}
      </Carousel>
    </RadixTabs.Root>
  );
};

const List = ({ children }: PropsWithChildren) => {
  return <RadixTabs.List className="mb-2 flex gap-x-1 rounded-md bg-tab-background p-0.5">{children}</RadixTabs.List>;
};

type TriggerProps = PropsWithChildren<{
  value: string;
}>;

const Trigger = ({ value, children }: TriggerProps) => {
  return (
    <RadixTabs.Trigger
      value={value}
      className={cnTw(
        'flex w-full items-center justify-center rounded bg-transparent px-2 py-1.5 text-button-small text-text-secondary',
        'transition-all duration-100',
        'data-[state=active]:bg-white data-[state=active]:text-text-primary data-[state=active]:shadow-card-shadow',
      )}
    >
      {' '}
      {children}
    </RadixTabs.Trigger>
  );
};

type ContentProps = PropsWithChildren<{
  value: string;
  __index?: number;
}>;

const Content = ({ value, __index, children }: ContentProps) => {
  return (
    <RadixTabs.Content className="relative min-h-0" value={value} forceMount>
      <Carousel.Item id={value} index={__index ?? 0}>
        {children}
      </Carousel.Item>
    </RadixTabs.Content>
  );
};

export const Tabs = Object.assign(Root, {
  List,
  Trigger,
  Content,
});

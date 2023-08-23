# 📇 Storybook

## Motivation
**Build UIs in isolation.**
Every piece of UI is a component. The superpower of components is that you don't need to
spin up the whole app just to see how they render. You can render a specific variation in isolation
by passing in props, mocking data, or faking events.

### Controls

Storybook Controls gives you a graphical UI to interact with a component's arguments dynamically
without needing to code. It creates an addon panel next to your component examples ("stories"), so you can edit them live.

Example of generic Story declaration:
```javascript
import type { Meta, StoryObj } from '@storybook/react';

import { withVersion } from '@renderer/shared/lib/utils';
import { Button } from './Button';

// Define UI group and version
const meta: Meta<typeof Button> = {
  title: 'Design system/Buttons/Button',
  component: Button,
  parameters: {
    controls: { sort: 'requiredFirst' },
  },
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof Button>;

// Configure available playground props
const UiOptions: Story['argTypes'] = {
  pallet: {
    control: 'radio',
    options: ['primary', 'secondary', 'error'],
  },
  icon: {
    options: [undefined, 'chat', 'learn-more', 'close'],
  },
  form: { control: false },
  className: { control: false },
  type: { control: false },
  suffixElement: { control: false },
  onClick: { control: false },
};
```

Here `withVersion` is a decorator function that wraps Story into container and provides version.
```javascript
const withVersion = (version: string) => {
  return (Story: StoryFn) => (
    <div className="flex flex-col gap-y-4 items-center">
      <h1>Version - {version}</h1>
      <Story />
    </div>
  );
};
```

Example of `<Button />` with Playground and 2 specific cases:
```javascript
// Playground with dynamic props
export const Playground: Story = {
  args: {
    pallet: 'primary',
    children: 'Hello button',
  },
  argTypes: UiOptions,
};

// 1st case for Button with and Icon 
export const Icon: Story = {
  render: () => (
    <Button pallet="primary" icon="chat">
      Hello button
    </Button>
  ),
};

// 2nd case for Button with suffix element
const suffixElement = <span className="rounded-lg bg-bg-shade text-caption text-text-white px-2 py-0.5">99+</span>;
export const SuffixElement: Story = {
  render: () => (
    <Button pallet="secondary" suffixElement={suffixElement} icon="chat">
      Hello button
    </Button>
  ),
};
```

### Useful links
1. [Controls configuration](https://storybook.js.org/docs/react/essentials/controls#configuration)
2. [Manage documentation](https://storybook.js.org/docs/react/writing-docs/mdx)
3. [Decorators](https://storybook.js.org/docs/react/essentials/toolbars-and-globals#create-a-decorator)

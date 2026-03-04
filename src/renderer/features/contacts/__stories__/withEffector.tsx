import { type Decorator } from '@storybook/react-vite';
import { type Store, type StoreWritable, fork } from 'effector';
import { Provider } from 'effector-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withEffector(values: [Store<any>, any][]): Decorator {
  return (Story) => {
    // Filter out derived stores (.map / combine) — fork() only accepts writable stores
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const writableValues = values.filter(([store]) => !(store as any).derived) as [StoreWritable<any>, any][];

    const scope = fork({ values: writableValues });

    return (
      <Provider value={scope}>
        <Story />
      </Provider>
    );
  };
}

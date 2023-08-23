/* eslint-disable i18next/no-literal-string */
import { StoryFn } from '@storybook/react';

/**
 * Adds version to the Story
 * @param version story version
 * @return {Function}
 */
export const withVersion = (version: string) => {
  return (Story: StoryFn) => (
    <div className="flex flex-col gap-y-4 items-center">
      <h1>Version - {version}</h1>
      <Story />
    </div>
  );
};

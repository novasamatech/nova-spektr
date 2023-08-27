import type { Meta, StoryObj } from '@storybook/react';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
import { TextBase } from './common/TextBase';
import * as Typography from './index';

const meta: Meta<typeof TextBase> = {
  title: 'Design system/Typography',
  component: TextBase,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type TitleStory = StoryObj<typeof Typography.TitleText>;
type LargeTitleStory = StoryObj<typeof Typography.LargeTitleText>;
type MediumTitleStory = StoryObj<typeof Typography.MediumTitleText>;
type SmallTitleStory = StoryObj<typeof Typography.SmallTitleText>;
type CaptionStory = StoryObj<typeof Typography.CaptionText>;
type BodyStory = StoryObj<typeof Typography.BodyText>;
type FootnoteStory = StoryObj<typeof Typography.FootnoteText>;
type HelpTextStory = StoryObj<typeof Typography.HelpText>;

export const Headline_Title: TitleStory = {
  args: {
    children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
  },
};

export const Headline_LargeTitle: LargeTitleStory = {
  args: {
    children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
  },
};

export const Headline_MediumTitle: MediumTitleStory = {
  args: {
    children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
  },
};

export const Headline_SmallTitle: SmallTitleStory = {
  args: {
    children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
  },
};

export const Body_Caption: CaptionStory = {
  args: {
    children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
  },
};

export const Body_Body: BodyStory = {
  args: {
    children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
  },
};

export const Body_Footnote: FootnoteStory = {
  args: {
    children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
  },
};

export const Body_Help: HelpTextStory = {
  args: {
    children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
  },
};

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
  render: () => <Typography.TitleText>This is a TitleText</Typography.TitleText>,
};

export const Headline_LargeTitle: LargeTitleStory = {
  render: () => <Typography.LargeTitleText>This is a LargeTitleText</Typography.LargeTitleText>,
};

export const Headline_MediumTitle: MediumTitleStory = {
  render: () => <Typography.MediumTitleText>This is a MediumTitleText</Typography.MediumTitleText>,
};

export const Headline_SmallTitle: SmallTitleStory = {
  render: () => <Typography.SmallTitleText>This is a SmallTitleText</Typography.SmallTitleText>,
};

export const Body_Caption: CaptionStory = {
  render: () => <Typography.CaptionText>This is a CaptionText</Typography.CaptionText>,
};

export const Body_Body: BodyStory = {
  render: () => <Typography.BodyText>This is a BodyText</Typography.BodyText>,
};

export const Body_Footnote: FootnoteStory = {
  render: () => <Typography.FootnoteText>This is a FootnoteText</Typography.FootnoteText>,
};

export const Body_Help: HelpTextStory = {
  render: () => <Typography.HelpText>This is a HelpText</Typography.HelpText>,
};

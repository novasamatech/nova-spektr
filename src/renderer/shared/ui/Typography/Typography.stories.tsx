import { type Meta, type StoryFn } from '@storybook/react';

import { TextBase } from './common/TextBase';
import { BodyText } from './components/BodyText';
import { CaptionText } from './components/CaptionText';
import { FootnoteText } from './components/FootnoteText';
import { HeadlineText } from './components/HeadlineText';
import { HelpText } from './components/HelpText';
import { LargeTitleText } from './components/LargeTitleText';
import { SmallTitleText } from './components/SmallTitleText';
import { TitleText } from './components/TitleText';

export default {
  title: 'v1/ui/Typography',
  component: TextBase,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof TextBase>;

const LargeTitleTemplate: StoryFn<typeof TextBase> = (args) => <LargeTitleText {...args} />;
export const LargeTitle = LargeTitleTemplate.bind({});
LargeTitle.args = {
  children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et',
};

const TitleTemplate: StoryFn<typeof TextBase> = (args) => <TitleText {...args} />;
export const Title = TitleTemplate.bind({});
Title.args = {
  children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
};

const SmallTitleTemplate: StoryFn<typeof TextBase> = (args) => <SmallTitleText {...args} />;
export const SmallTitle = SmallTitleTemplate.bind({});
SmallTitle.args = {
  children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
};

const CaptionTemplate: StoryFn<typeof TextBase> = (args) => <CaptionText {...args} />;
export const Caption = CaptionTemplate.bind({});
Caption.args = {
  children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
};

const HeadlineTemplate: StoryFn<typeof TextBase> = (args) => <HeadlineText {...args} />;
export const Headline = HeadlineTemplate.bind({});
Headline.args = {
  children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
};

const BodyTemplate: StoryFn<typeof TextBase> = (args) => <BodyText {...args} />;
export const Body = BodyTemplate.bind({});
Body.args = {
  children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
};

const FootnoteTemplate: StoryFn<typeof TextBase> = (args) => <FootnoteText {...args} />;
export const Footnote = FootnoteTemplate.bind({});
Footnote.args = {
  children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
};

const HelpTextTemplate: StoryFn<typeof TextBase> = (args) => <HelpText {...args} />;
export const Help = HelpTextTemplate.bind({});
Help.args = {
  children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
};

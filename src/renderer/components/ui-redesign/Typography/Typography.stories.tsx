import { ComponentMeta, ComponentStory } from '@storybook/react';

import TextBase from '@renderer/components/ui-redesign/Typography/common/TextBase';
import {
  LargeTitleText,
  TitleText,
  SmallTitleText,
  CaptionText,
  HeadlineText,
  BodyText,
  FootnoteText,
} from '@renderer/components/ui-redesign';

export default {
  title: 'Redesign/Typography',
  component: TextBase,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof TextBase>;

const LargeTitleTemplate: ComponentStory<typeof TextBase> = (args) => <LargeTitleText {...args} />;
export const LargeTitle = LargeTitleTemplate.bind({});
LargeTitle.args = {
  children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
};

const TitleTemplate: ComponentStory<typeof TextBase> = (args) => <TitleText {...args} />;
export const Title = TitleTemplate.bind({});
Title.args = {
  children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
};

const SmallTitleTemplate: ComponentStory<typeof TextBase> = (args) => <SmallTitleText {...args} />;
export const SmallTitle = SmallTitleTemplate.bind({});
SmallTitle.args = {
  children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
};

const CaptionTemplate: ComponentStory<typeof TextBase> = (args) => <CaptionText {...args} />;
export const Caption = CaptionTemplate.bind({});
Caption.args = {
  children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
};

const HeadlineTemplate: ComponentStory<typeof TextBase> = (args) => <HeadlineText {...args} />;
export const Headline = HeadlineTemplate.bind({});
Headline.args = {
  children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
};

const BodyTemplate: ComponentStory<typeof TextBase> = (args) => <BodyText {...args} />;
export const Body = BodyTemplate.bind({});
Body.args = {
  children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
};

const FootnoteTemplate: ComponentStory<typeof TextBase> = (args) => <FootnoteText {...args} />;
export const Footnote = FootnoteTemplate.bind({});
Footnote.args = {
  children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
};

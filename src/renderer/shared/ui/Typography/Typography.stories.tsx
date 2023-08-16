import { ComponentMeta, ComponentStory } from '@storybook/react';

import TextBase from './common/TextBase';
import { BodyText } from './components/BodyText';
import { CaptionText } from './components/CaptionText';
import { FootnoteText } from './components/FootnoteText';
import { HelpText } from './components/HelpText';
import { SmallTitleText } from './components/SmallTitleText';
import { TitleText } from './components/TitleText';
import { MediumTitleText } from '@renderer/shared/ui';

export default {
  title: 'Redesign/Typography',
  component: TextBase,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof TextBase>;

const TitleTemplate: ComponentStory<typeof TextBase> = (args) => <TitleText {...args} />;
export const Headline_Title = TitleTemplate.bind({});
Headline_Title.args = {
  children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
};

const MediumTitleTemplate: ComponentStory<typeof TextBase> = (args) => <MediumTitleText {...args} />;
export const Headline_MediumTitle = MediumTitleTemplate.bind({});
Headline_MediumTitle.args = {
  children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
};

const SmallTitleTemplate: ComponentStory<typeof TextBase> = (args) => <SmallTitleText {...args} />;
export const Headline_SmallTitle = SmallTitleTemplate.bind({});
Headline_SmallTitle.args = {
  children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
};

const CaptionTemplate: ComponentStory<typeof TextBase> = (args) => <CaptionText {...args} />;
export const Body_Caption = CaptionTemplate.bind({});
Body_Caption.args = {
  children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
};

const BodyTemplate: ComponentStory<typeof TextBase> = (args) => <BodyText {...args} />;
export const Body_Body = BodyTemplate.bind({});
Body_Body.args = {
  children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
};

const FootnoteTemplate: ComponentStory<typeof TextBase> = (args) => <FootnoteText {...args} />;
export const Body_Footnote = FootnoteTemplate.bind({});
Body_Footnote.args = {
  children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
};

const HelpTextTemplate: ComponentStory<typeof TextBase> = (args) => <HelpText {...args} />;
export const Body_Help = HelpTextTemplate.bind({});
Body_Help.args = {
  children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
};

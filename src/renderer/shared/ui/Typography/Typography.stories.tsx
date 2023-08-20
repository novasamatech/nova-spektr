import { ComponentMeta, ComponentStory } from '@storybook/react';

import { TextBase } from './common/TextBase';
import * as Typography from './index';

export default {
  title: 'ui/Typography',
  component: TextBase,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof TextBase>;

const TitleTemplate: ComponentStory<typeof TextBase> = (args) => <Typography.TitleText {...args} />;
export const Headline_Title = TitleTemplate.bind({});
Headline_Title.args = {
  children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
};

const LargeTitleTemplate: ComponentStory<typeof TextBase> = (args) => <Typography.LargeTitleText {...args} />;
export const Headline_LargeTitle = LargeTitleTemplate.bind({});
Headline_LargeTitle.args = {
  children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
};

const MediumTitleTemplate: ComponentStory<typeof TextBase> = (args) => <Typography.MediumTitleText {...args} />;
export const Headline_MediumTitle = MediumTitleTemplate.bind({});
Headline_MediumTitle.args = {
  children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
};

const SmallTitleTemplate: ComponentStory<typeof TextBase> = (args) => <Typography.SmallTitleText {...args} />;
export const Headline_SmallTitle = SmallTitleTemplate.bind({});
Headline_SmallTitle.args = {
  children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
};

const CaptionTemplate: ComponentStory<typeof TextBase> = (args) => <Typography.CaptionText {...args} />;
export const Body_Caption = CaptionTemplate.bind({});
Body_Caption.args = {
  children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
};

const BodyTemplate: ComponentStory<typeof TextBase> = (args) => <Typography.BodyText {...args} />;
export const Body_Body = BodyTemplate.bind({});
Body_Body.args = {
  children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
};

const FootnoteTemplate: ComponentStory<typeof TextBase> = (args) => <Typography.FootnoteText {...args} />;
export const Body_Footnote = FootnoteTemplate.bind({});
Body_Footnote.args = {
  children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
};

const HelpTextTemplate: ComponentStory<typeof TextBase> = (args) => <Typography.HelpText {...args} />;
export const Body_Help = HelpTextTemplate.bind({});
Body_Help.args = {
  children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et ',
};

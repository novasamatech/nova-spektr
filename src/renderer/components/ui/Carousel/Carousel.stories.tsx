import { ComponentMeta, ComponentStory } from '@storybook/react';

import SlideOne from '@images/misc/onboarding/slide-1.svg';
import SlideTwo from '@images/misc/onboarding/slide-2.svg';
import SlideThree from '@images/misc/onboarding/slide-3.svg';
import Carousel from './Carousel';

export default {
  title: 'Carousel',
  component: Carousel,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof Carousel>;

const Template: ComponentStory<typeof Carousel> = (args) => <Carousel {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  animationDuration: 500,
  slides: [
    <div className="flex flex-col items-center gap-y-3">
      <img src={SlideOne} alt="" width={500} height={385} />
      <p>Description 1</p>
    </div>,
    <div className="flex flex-col items-center gap-y-3">
      <img src={SlideTwo} alt="" width={500} height={385} />
      <p>Description 2</p>
    </div>,
    <div className="flex flex-col items-center gap-y-3">
      <img src={SlideThree} alt="" width={500} height={385} />
      <p>Description 3</p>
    </div>,
  ],
};

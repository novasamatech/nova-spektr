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

const slides = [SlideOne, SlideTwo, SlideThree].map((slide, index) => ({
  id: index,
  node: (
    <div key="1" className="flex flex-col items-center gap-y-3">
      <img src={slide} alt="" width={500} height={385} />
      <p>Description {index}</p>
    </div>
  ),
}));

export const Primary = Template.bind({});
Primary.args = {
  animationDuration: 500,
  slides,
};

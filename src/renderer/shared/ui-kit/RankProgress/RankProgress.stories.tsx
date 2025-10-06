import type { Meta, StoryObj } from '@storybook/react';

import { RankProgress } from './RankProgress';

const meta: Meta<typeof RankProgress> = {
  title: 'Design System/kit/RankProgress',
  component: RankProgress,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof RankProgress>;

const ranks = [
  { id: 'I', name: 'Humble', time: 'n/a', color: '#bbbbbb' },
  { id: 'II', name: 'Proficient', time: '~1 y', color: '#ffad4f' },
  { id: 'III', name: 'Fellow', time: '~2 y', color: '#ffa5a2' },
  { id: 'IV', name: 'Architect', time: '>3 y', color: '#d7abfe' },
  { id: 'V', name: 'Architect Adept', time: '>4 y', color: '#69d8ff' },
  { id: 'VI', name: 'Grand Architect', time: '>5 y', color: '#6de69f' },
  { id: 'VII', name: 'Free Master', time: '>6 y', color: '#cccccc' },
  { id: 'VIII', name: 'Master Constant', time: '>11 y', color: '#dddddd' },
  { id: 'IX', name: 'Grand Master', time: '>19 y', color: '#eeeeee' },
];

export const Default: Story = {
  args: {
    ranks,
    currentRankId: 'VI',
    title: 'From I Dan',
  },
};

export const EarlyRank: Story = {
  args: {
    ranks,
    currentRankId: 'II',
    title: 'From I Dan',
  },
};

export const LateRank: Story = {
  args: {
    ranks,
    currentRankId: 'VIII',
    title: 'From I Dan',
  },
};

export const WithoutTitle: Story = {
  args: {
    ranks,
    currentRankId: 'VI',
  },
};


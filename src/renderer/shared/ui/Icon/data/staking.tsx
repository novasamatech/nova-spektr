/* eslint-disable i18next/no-literal-string */
import StakingSprite from '@renderer/assets/images/icons/staking.svg';

export const StakingImages = {
  'change-reward-dest': {
    svg: true,
    size: { 20: `${StakingSprite}#change-reward-dest-20` },
  },
  'change-validators': {
    svg: true,
    size: { 20: `${StakingSprite}#change-validators-20` },
  },
  'return-to-stake': {
    svg: true,
    size: { 20: `${StakingSprite}#return-to-stake-20` },
  },
  'set-validators': {
    svg: true,
    size: { 20: `${StakingSprite}#set-validators-20` },
  },
  'stake-more': {
    svg: true,
    size: { 20: `${StakingSprite}#stake-more-20` },
  },
  'start-staking': {
    svg: true,
    size: { 20: `${StakingSprite}#start-staking-20` },
  },
  unstake: {
    svg: true,
    size: { 20: `${StakingSprite}#unstake-20` },
  },
  'view-validators': {
    svg: true,
    size: { 20: `${StakingSprite}#view-validators-20` },
  },
  'withdraw-unstake': {
    svg: true,
    size: { 20: `${StakingSprite}#withdraw-unstake-20` },
  },
} as const;

export type Staking = keyof typeof StakingImages;

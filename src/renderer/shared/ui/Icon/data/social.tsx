/* eslint-disable i18next/no-literal-string */
import SocialSprite from '@renderer/assets/images/icons/social.svg';

export const SocialImages = {
  github: {
    svg: true,
    size: { 32: `${SocialSprite}#github-32` },
  },
  medium: {
    svg: true,
    size: { 32: `${SocialSprite}#medium-32` },
  },
  telegram: {
    svg: true,
    size: { 32: `${SocialSprite}#telegram-32` },
  },
  'twitter-old': {
    svg: true,
    size: { 32: `${SocialSprite}#twitter-old-32` },
  },
  'twitter-new': {
    svg: true,
    size: { 32: `${SocialSprite}#twitter-new-32` },
  },
  youtube: {
    svg: true,
    size: { 32: `${SocialSprite}#youtube-32` },
  },
} as const;

export type Social = keyof typeof SocialImages;

/* eslint-disable i18next/no-literal-string */
import PolkaholicImg from '@images/icons/notSvg/polkaholic.webp';
import ExplorersSprite from '@renderer/assets/images/icons/explorers.svg';

export const ExplorerImages = {
  'unknown-explorer': {
    svg: true,
    size: { 16: `${ExplorersSprite}#unknown-explorer-16` },
  },
  polkascan: {
    svg: true,
    size: { 16: `${ExplorersSprite}#polkascan-16` },
  },
  'polkascan-alt': {
    svg: true,
    size: { 16: `${ExplorersSprite}#polkascan-alt-16` },
  },
  'polkascan-white': {
    svg: true,
    size: { 16: `${ExplorersSprite}#polkascan-white-16` },
  },
  subid: {
    svg: true,
    size: { 16: `${ExplorersSprite}#subid-16` },
  },
  'subid-white': {
    svg: true,
    size: { 16: `${ExplorersSprite}#subid-white-16` },
  },
  subscan: {
    svg: true,
    size: { 16: `${ExplorersSprite}#subscan-16` },
  },
  'subscan-white': {
    svg: true,
    size: { 16: `${ExplorersSprite}#subscan-white-16` },
  },
  statescan: {
    svg: true,
    size: { 16: `${ExplorersSprite}#statescan-16` },
  },
  ternoa: {
    svg: true,
    size: { 16: `${ExplorersSprite}#ternoa-16` },
  },
  polkaholic: {
    svg: false,
    size: { 16: PolkaholicImg },
  },
} as const;

export type Explorers = keyof typeof ExplorerImages;

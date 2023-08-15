/* eslint-disable i18next/no-literal-string */
import ServiceSprite from '@renderer/assets/images/icons/service.svg';

export const ServiceImages = {
  'add-address': {
    svg: true,
    size: { 20: `${ServiceSprite}#add-address-20` },
  },
  lock: {
    svg: true,
    size: { 16: `${ServiceSprite}#lock-16` },
  },
  chat: {
    svg: true,
    size: { 16: `${ServiceSprite}#chat-16`, 20: `${ServiceSprite}#chat-20` },
  },
  close: {
    svg: true,
    size: { 16: `${ServiceSprite}#close-16`, 20: `${ServiceSprite}#close-20` },
  },
  copy: {
    svg: true,
    size: { 16: `${ServiceSprite}#copy-16`, 20: `${ServiceSprite}#copy-20` },
  },
  delete: {
    svg: true,
    size: { 20: `${ServiceSprite}#delete-20` },
  },
  download: {
    svg: true,
    size: { 20: `${ServiceSprite}#download-20` },
  },
  edit: {
    svg: true,
    size: { 20: `${ServiceSprite}#edit-20` },
  },
  'error-file': {
    svg: true,
    size: { 32: `${ServiceSprite}#error-file-32` },
  },
  hide: {
    svg: true,
    size: { 20: `${ServiceSprite}#hide-20` },
  },
  info: {
    svg: true,
    size: { 16: `${ServiceSprite}#info-16` },
  },
  language: {
    svg: true,
    size: { 32: `${ServiceSprite}#language-16` },
  },
  'learn-more': {
    svg: true,
    size: { 16: `${ServiceSprite}#learn-more-16`, 20: `${ServiceSprite}#learn-more-20` },
  },
  'magic-wand': {
    svg: true,
    size: { 20: `${ServiceSprite}#magic-wand-20` },
  },
  matrix: {
    svg: true,
    size: { 32: `${ServiceSprite}#matrix-32` },
  },
  more: {
    svg: true,
    size: { 16: `${ServiceSprite}#more-16`, 20: `${ServiceSprite}#more-20` },
  },
  networks: {
    svg: true,
    size: { 32: `${ServiceSprite}#networks-32` },
  },
  'new-tab': {
    svg: true,
    size: { 20: `${ServiceSprite}#new-tab-20` },
  },
  plus: {
    svg: true,
    size: { 16: `${ServiceSprite}#plus-16`, 20: `${ServiceSprite}#plus-20` },
  },
  refresh: {
    svg: true,
    size: { 20: `${ServiceSprite}#refresh-20` },
  },
  scan: {
    svg: true,
    size: { 20: `${ServiceSprite}#scan-20` },
  },
  search: {
    svg: true,
    size: { 16: `${ServiceSprite}#search-16`, 20: `${ServiceSprite}#search-20` },
  },
  'settings-lite': {
    svg: true,
    size: { 16: `${ServiceSprite}#settings-16`, 20: `${ServiceSprite}#settings-20` },
  },
  show: {
    svg: true,
    size: { 20: `${ServiceSprite}#show-20` },
  },
  'success-file': {
    svg: true,
    size: { 32: `${ServiceSprite}#success-file-32` },
  },
  'upload-file': {
    svg: true,
    size: { 20: `${ServiceSprite}#upload-file-20`, 32: `${ServiceSprite}#upload-file-32` },
  },
  'identicon-placeholder': {
    svg: true,
    size: {
      16: `${ServiceSprite}#identicon-placeholder-16`,
      20: `${ServiceSprite}#identicon-placeholder-20`,
      32: `${ServiceSprite}#identicon-placeholder-32`,
    },
  },
} as const;

export type Service = keyof typeof ServiceImages;

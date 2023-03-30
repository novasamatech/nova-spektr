import { InfoSection } from '@renderer/components/ui-redesign/Popovers/InfoPopover/InfoPopover';

/*eslint i18next/no-literal-string: [0]*/
export const menuLinks = [
  <a key="1" href="https://metadata.novasama.io/#/polkadot">
    some link
  </a>,
  <a key="2" href="https://metadata.novasama.io/#/kusama">
    some other link
  </a>,
];
export const popoverItems: InfoSection[] = [
  {
    title: 'adress',
    items: ['dsfsdfdfssdff'],
  },
  { title: 'id', items: ['sdfddfs'] },
  {
    title: 'links',
    items: menuLinks,
  },
];

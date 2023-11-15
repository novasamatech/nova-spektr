import { act, render, screen } from '@testing-library/react';

import InfoPopover, { InfoSection } from './InfoPopover';

jest.mock('@app/providers', () => ({
  useMatrix: jest.fn(),
}));

const menuLinks = [
  {
    id: '3',
    value: (
      <a key="1" href="https://metadata.novasama.io/#/polkadot">
        some link
      </a>
    ),
  },
  {
    id: '4',
    value: (
      <a key="2" href="https://metadata.novasama.io/#/kusama">
        some other link
      </a>
    ),
  },
];
export const popoverItems: InfoSection[] = [
  {
    title: 'adress',
    items: [{ value: 'some text', id: '1' }],
  },
  { title: 'id', items: [{ value: '123456789', id: '2' }] },
  {
    title: 'links',
    items: menuLinks,
  },
];

describe('components/ui-redesign/InfoPopover', () => {
  test('should render component', async () => {
    window.HTMLElement.prototype.scrollIntoView = jest.fn();

    render(<InfoPopover data={popoverItems}>test</InfoPopover>);

    const button = screen.getByText('test');
    await act(async () => button.click());

    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems).toHaveLength(menuLinks.length);
  });
});

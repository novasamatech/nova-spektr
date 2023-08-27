import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { InfoPopover, InfoSection } from './InfoPopover';

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

const popoverItems: InfoSection[] = [
  {
    title: 'address',
    items: [{ value: 'some text', id: '1' }],
  },
  { title: 'id', items: [{ value: 'item_value', id: '2' }] },
  {
    title: 'links',
    items: menuLinks,
  },
];

describe('ui/Popovers/InfoPopover', () => {
  test('should render component', async () => {
    window.HTMLElement.prototype.scrollIntoView = jest.fn();

    render(<InfoPopover data={popoverItems}>test</InfoPopover>);

    await userEvent.click(screen.getByText('test'));

    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems).toHaveLength(menuLinks.length);
  });
});

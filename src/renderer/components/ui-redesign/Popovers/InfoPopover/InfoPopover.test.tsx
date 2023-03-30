import { act, render, screen } from '@testing-library/react';

import InfoPopover from './InfoPopover';
import { menuLinks, popoverItems } from '@renderer/components/ui-redesign/Popovers/InfoPopover/mock.data';

describe('components/ui-redesign/InfoPopover', () => {
  test('should render component', async () => {
    render(<InfoPopover data={popoverItems}>test</InfoPopover>);

    const button = screen.getByText('test');
    await act(async () => button.click());

    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems).toHaveLength(menuLinks.length);
  });
});

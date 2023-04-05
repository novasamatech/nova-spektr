import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Tabs from './Tabs';
import { tabItems } from '@renderer/components/ui-redesign/Tabs/Tabs.stories';

describe('ui/Tabs', () => {
  test('should render component', () => {
    render(<Tabs items={tabItems} />);

    const tabContent = screen.getByText('tab 1 content');
    const tabTitle = screen.queryByText('Tab 1 title');
    expect(tabTitle).toBeInTheDocument();
    expect(tabContent).toBeInTheDocument();
  });

  test('should change tabs via keyboard', async () => {
    render(<Tabs items={tabItems} />);

    const tab1Content = screen.queryByText('tab 1 content');

    await userEvent.keyboard('[Tab][ArrowRight]');

    expect(tab1Content).not.toBeInTheDocument();

    const tab2Content = screen.queryByText('tab 2 content');
    expect(tab2Content).toBeInTheDocument();
  });
});

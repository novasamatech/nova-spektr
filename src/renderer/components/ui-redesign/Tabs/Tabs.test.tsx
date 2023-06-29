import { screen, render, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Tabs } from './Tabs';
import { TabItem } from './common/types';

const tabItems: TabItem[] = [
  { id: '1', title: 'Tab 1 title', panel: <div>tab 1 content</div> },
  { id: '2', title: 'Tab 2 title', panel: <div>tab 2 content</div> },
  { id: '3', title: 'Tab 3 title', panel: <div>tab 3 content</div> },
];

describe('ui/Tabs', () => {
  test('should render component', () => {
    render(<Tabs items={tabItems} />);

    const tabContent = screen.getByText('tab 1 content');
    const tabTitle = screen.getByText('Tab 1 title');
    expect(tabTitle).toBeInTheDocument();
    expect(tabContent).toBeInTheDocument();
  });

  test('should change tabs via keyboard', async () => {
    const user = userEvent.setup();
    render(<Tabs items={tabItems} />);

    const tab1Content = screen.queryByText('tab 1 content');

    await act(() => user.keyboard('[Tab][ArrowRight]'));

    expect(tab1Content).not.toBeInTheDocument();

    const tab2Content = screen.getByText('tab 2 content');
    expect(tab2Content).toBeInTheDocument();
  });
});

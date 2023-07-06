import { act, screen, render, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Tooltip } from './Tooltip';

describe('ui/Popover', () => {
  test('should render component', () => {
    render(<Tooltip content="content">Hover me</Tooltip>);

    const text = screen.getByText('Hover me');
    const content = screen.queryByText('content');
    expect(text).toBeInTheDocument();
    expect(content).not.toBeInTheDocument();
  });

  test('should toggle tooltip on hover/unhover', async () => {
    const user = userEvent.setup();

    render(<Tooltip content="content">Hover me</Tooltip>);

    const text = screen.getByText('Hover me');
    let content = screen.queryByText('content');
    expect(content).not.toBeInTheDocument();

    await act(async () => user.hover(text));

    content = await screen.findByText('content');
    expect(content).toBeInTheDocument();

    await act(async () => user.unhover(text));

    await waitForElementToBeRemoved(screen.queryByText('content'), { timeout: 500 });
  });
});

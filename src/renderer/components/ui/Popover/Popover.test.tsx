import { act, screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Popover from './Popover';

describe('ui/Popover', () => {
  test('should render component', () => {
    render(
      <Popover titleText="title" content="content">
        Hover me
      </Popover>,
    );

    const text = screen.getByText('Hover me');
    const title = screen.queryByText('title');
    expect(text).toBeInTheDocument();
    expect(title).not.toBeInTheDocument();
  });

  test('should toggle popover on hover/unhover', async () => {
    const user = userEvent.setup();

    render(
      <Popover titleText="title" content="content">
        Hover me
      </Popover>,
    );

    const text = screen.getByText('Hover me');
    let title = screen.queryByText('title');
    expect(title).not.toBeInTheDocument();

    await user.hover(text);

    title = screen.getByText('title');
    expect(title).toBeInTheDocument();

    await user.unhover(text);

    title = screen.queryByText('title');
    expect(title).not.toBeInTheDocument();
  });

  test('should toggle popover on focus/blur', async () => {
    render(
      <Popover titleText="title" content="content">
        Hover me
      </Popover>,
    );

    const text = screen.getByText('Hover me');
    let title = screen.queryByText('title');
    expect(title).not.toBeInTheDocument();

    await act(async () => text.focus());

    title = screen.getByText('title');
    expect(title).toBeInTheDocument();

    await act(async () => text.blur());

    title = screen.queryByText('title');
    expect(title).not.toBeInTheDocument();
  });
});

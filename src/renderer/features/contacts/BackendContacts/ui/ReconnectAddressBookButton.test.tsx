import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ReconnectAddressBookButton } from './ReconnectAddressBookButton';

const testState = vi.hoisted(() => ({
  editStarted: vi.fn(),
}));

vi.mock('@/shared/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'addressBook.auth.reconnectTooltip': 'Address book is disconnected. Reconnect to restore access.',
        'operations.drafts.reconnectOverlayButton': 'Reconnect address book',
      };

      return translations[key] ?? key;
    },
  }),
}));

vi.mock('@/aggregates/backend', () => ({
  backendConfigurationModel: {
    events: { editStarted: testState.editStarted },
  },
}));

describe('ReconnectAddressBookButton', () => {
  it('opens backend configuration when clicked', async () => {
    const user = userEvent.setup();

    render(<ReconnectAddressBookButton />);

    await user.click(screen.getByRole('button', { name: 'Reconnect address book' }));

    expect(testState.editStarted).toHaveBeenCalledTimes(1);
  });

  it('supports compact text usage with a custom label', () => {
    render(<ReconnectAddressBookButton size="sm" variant="text" iconSize={14} label="Reconnect" className="p-0" />);

    const button = screen.getByRole('button', { name: 'Reconnect' });

    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('p-0');
  });
});

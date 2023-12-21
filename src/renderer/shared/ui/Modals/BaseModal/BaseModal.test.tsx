import { render, screen } from '@testing-library/react';

import { BaseModal } from './BaseModal';

jest.mock('@app/providers', () => ({
  useMatrix: jest.fn(),
}));

describe('ui/Modals/BaseModal', () => {
  test('should render component', () => {
    render(
      <BaseModal isOpen onClose={() => {}}>
        <button type="button">ok</button>
      </BaseModal>,
    );

    const button = screen.getByRole('button', { name: 'ok' });
    expect(button).toBeInTheDocument();
  });
});

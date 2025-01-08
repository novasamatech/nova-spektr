import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { Duration } from './Duration';

vi.mock('@/shared/i18n', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('ui/Duration', () => {
  test('should render component', () => {
    render(<Duration seconds="1" />);

    const durationValue = screen.getByText('time.minutesSeconds');
    expect(durationValue).toBeInTheDocument();
  });
});

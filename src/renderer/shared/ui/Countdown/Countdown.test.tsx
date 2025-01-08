import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { Countdown } from './Countdown';

vi.mock('@/shared/i18n', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('ui/Countdown', () => {
  test('should render component', () => {
    render(<Countdown countdown={10} />);

    const title = screen.getByText('signing.qrCountdownTitle');
    expect(title).toBeInTheDocument();

    const timer = screen.getByText('0:10');
    expect(timer).toBeInTheDocument();
  });
});

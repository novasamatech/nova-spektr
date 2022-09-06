import { render, screen } from '@testing-library/react';

import Balance from './Balance';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('ui/Balance', () => {
  test('should render component', () => {
    render(<Balance value={'100'} precision={10} />);
    const balance = screen.getByText('number');
    expect(balance).toBeInTheDocument();
  });
});

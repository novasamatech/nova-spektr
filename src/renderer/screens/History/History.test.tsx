import { render, screen } from '@testing-library/react';

import History from './History';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/History', () => {
  test('should render component', () => {
    render(<History />);

    const text = screen.getByText('history.title');
    expect(text).toBeInTheDocument();
  });
});

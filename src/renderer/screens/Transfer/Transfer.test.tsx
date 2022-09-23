import { render, screen } from '@testing-library/react';

import Transfer from './Transfer';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screen/Transfer', () => {
  test('should render component', () => {
    render(<Transfer />);

    const text = screen.getByText('transfers.title');
    expect(text).toBeInTheDocument();
  });
});

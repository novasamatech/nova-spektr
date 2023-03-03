import { render, screen } from '@testing-library/react';

import Credentials from './Credentials';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Settings/Matrix/Credentials', () => {
  test('should render component', () => {
    render(<Credentials />);

    const title = screen.getByText('credentials');
    expect(title).toBeInTheDocument();
  });
});

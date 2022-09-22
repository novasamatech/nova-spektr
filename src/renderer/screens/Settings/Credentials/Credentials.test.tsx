import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Credentials from './Credentials';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screen/Overview/Credentials', () => {
  test('should render component', () => {
    render(<Credentials />, { wrapper: MemoryRouter });

    const text = screen.getByText('matrixCredentials.subTitle');
    expect(text).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import LoginForm from './LoginForm';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screen/Settings/Matrix/LoginForm', () => {
  test('should render component', () => {
    render(<LoginForm />, { wrapper: MemoryRouter });

    const title = screen.getByText('settings.title');
    const subTitle = screen.getByText('settings.matrix.subTitle');
    expect(title).toBeInTheDocument();
    expect(subTitle).toBeInTheDocument();
  });
});

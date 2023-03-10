import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Matrix from './Matrix';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screen/Settings/Matrix', () => {
  test('should render component', () => {
    render(<Matrix />, { wrapper: MemoryRouter });

    const title = screen.getByText('settings.title');
    const subTitle = screen.getByText('settings.matrix.subTitle');
    expect(title).toBeInTheDocument();
    expect(subTitle).toBeInTheDocument();
  });
});

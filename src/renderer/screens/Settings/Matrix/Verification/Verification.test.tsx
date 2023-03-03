import { render, screen } from '@testing-library/react';

import Verification from './Verification';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Settings/Matrix/Verification', () => {
  test('should render component', () => {
    render(<Verification />);

    const title = screen.getByText('verification');
    expect(title).toBeInTheDocument();
  });
});

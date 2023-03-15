import { render, screen } from '@testing-library/react';

import CreateMultisigAccount from './CreateMultisigAccount';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screen/CreateMultisigAccount', () => {
  test('should render component', () => {
    render(<CreateMultisigAccount />);

    const text = screen.getByText('multisigOperations.title');
    expect(text).toBeInTheDocument();
  });
});

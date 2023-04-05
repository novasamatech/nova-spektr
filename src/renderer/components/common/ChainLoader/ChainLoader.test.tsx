import { render, screen } from '@testing-library/react';

import ChainLoader from './ChainLoader';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string, params?: any) => `${key} ${params?.chainName || ''}`,
  }),
}));

describe('screens/Staking/components/ChainLoader', () => {
  test('should render component', () => {
    render(<ChainLoader chainName="Westend" />);

    const text = screen.getByText('staking.loadingMessage Westend');
    expect(text).toBeInTheDocument();
  });
});

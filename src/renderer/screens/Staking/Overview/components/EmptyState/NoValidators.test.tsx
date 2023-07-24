import { render, screen } from '@testing-library/react';

import { NoValidators } from './NoValidators';

jest.mock('@renderer/app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Staking/Overview/NoValidators', () => {
  test('should render component', () => {
    render(<NoValidators />);

    const label = screen.getByText('staking.overview.noValidatorsLabel');
    expect(label).toBeInTheDocument();
  });
});

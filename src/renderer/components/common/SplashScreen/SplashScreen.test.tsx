import { render, screen } from '@testing-library/react';

import SplashScreen from './SplashScreen';

describe('components/common/SplashScreen', () => {
  test('should render component', () => {
    render(<SplashScreen />);

    const video = screen.getByTestId('splash-video');
    expect(video).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';

import { BlockExplorer } from './BlockExplorer';

describe('ui/BlockExplorer', () => {
  test('should render component', () => {
    const explorerTitle = 'Explorer';
    render(<BlockExplorer href="#">{explorerTitle}</BlockExplorer>);

    const children = screen.getByText(explorerTitle);
    expect(children).toBeInTheDocument();
  });
});

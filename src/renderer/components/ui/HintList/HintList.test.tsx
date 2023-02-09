import { render, screen } from '@testing-library/react';

import HintList from './HintList';

describe('ui/HintList', () => {
  test('should render component', () => {
    render(
      <HintList>
        <HintList.Item>item one</HintList.Item>
        <HintList.Item>item two</HintList.Item>
        <HintList.Item>item three</HintList.Item>
      </HintList>,
    );

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
  });
});

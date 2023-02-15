import { render, screen } from '@testing-library/react';

import { TEST_ADDRESS } from '@renderer/shared/utils/constants';
import AddressOnPlate from './AddressOnPlate';

describe('common/AddressOnPlate', () => {
  test('should render component', () => {
    const props = {
      address: TEST_ADDRESS,
      title: 'placeholder',
      name: 'My account',
      subName: 'My subname',
      addressPrefix: 10,
    };

    render(<AddressOnPlate {...props} />);

    const title = screen.getByText(props.title);
    const name = screen.getByText(props.name);
    const subName = screen.getByText(props.subName);
    expect(title).toBeInTheDocument();
    expect(name).toBeInTheDocument();
    expect(subName).toBeInTheDocument();
  });
});

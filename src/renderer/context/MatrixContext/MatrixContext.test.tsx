import { render, screen, waitFor } from '@testing-library/react';

import Matrix from '@renderer/services/matrix';
import { MatrixProvider } from './MatrixContext';

jest.mock('@renderer/services/matrix', () => jest.fn().mockReturnValue({}));

describe('context/MatrixContext', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render children and loader', async () => {
    (Matrix as jest.Mock).mockImplementation(() => ({
      init: jest.fn(),
      loginFromCache: jest.fn(),
      setupSubscribers: jest.fn(),
      stopClient: jest.fn(),
    }));

    render(
      <MatrixProvider loader="loading" onAutoLoginFail={() => {}}>
        children
      </MatrixProvider>,
    );

    expect(screen.getByText('loading')).toBeInTheDocument();
    expect(screen.queryByText('children')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('loading')).not.toBeInTheDocument();
      expect(screen.getByText('children')).toBeInTheDocument();
    });
  });

  test('should setup subscribers after login', async () => {
    const setupSubscribers = jest.fn();

    (Matrix as jest.Mock).mockImplementation(() => ({
      init: jest.fn(),
      loginFromCache: jest.fn(),
      stopClient: jest.fn(),
      setupSubscribers,
    }));

    const loginFailSpy = jest.fn();
    render(
      <MatrixProvider loader="loading" onAutoLoginFail={loginFailSpy}>
        children
      </MatrixProvider>,
    );

    expect(screen.queryByText('loading')).toBeInTheDocument();
    expect(setupSubscribers).not.toBeCalled();
    expect(loginFailSpy).not.toBeCalled();

    await waitFor(() => {
      expect(screen.queryByText('loading')).not.toBeInTheDocument();
      expect(setupSubscribers).toBeCalled();
    });
  });

  test('should handle call onAutoLoginFail', () => {
    (Matrix as jest.Mock).mockReturnValue({
      stopClient: jest.fn(),
      init: jest.fn(() => {
        throw new Error('fail');
      }),
    });

    const loginFailSpy = jest.fn();
    render(
      <MatrixProvider loader="loading" onAutoLoginFail={loginFailSpy}>
        children
      </MatrixProvider>,
    );

    expect(loginFailSpy).toBeCalledTimes(1);
    expect(loginFailSpy).toBeCalledWith('fail');
  });
});

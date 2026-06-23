import { fireEvent, render, screen } from '@testing-library/react';

import { type ChainId } from '@/shared/core';

vi.mock('@/shared/i18n', () => ({
  useI18n: vi.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

import { QrGeneratorContainer } from './QrGeneratorContainer';

const CHAIN_ID = '0x00' as ChainId;

describe('ui/QrGeneratorContainer', () => {
  test('renders the qr children while there is no error', () => {
    render(
      <QrGeneratorContainer countdown={60} chainId={CHAIN_ID} onQrReset={vi.fn()}>
        <div data-testid="qr-child" />
      </QrGeneratorContainer>,
    );

    expect(screen.getByTestId('qr-child')).toBeInTheDocument();
  });

  test('shows a metadata error with a retry action instead of the loading qr when error is set', () => {
    const onQrReset = vi.fn();

    render(
      <QrGeneratorContainer countdown={60} chainId={CHAIN_ID} error onQrReset={onQrReset}>
        <div data-testid="qr-child" />
      </QrGeneratorContainer>,
    );

    expect(screen.queryByTestId('qr-child')).not.toBeInTheDocument();
    expect(screen.getByText('signing.metadataLoadError')).toBeInTheDocument();

    fireEvent.click(screen.getByText('signing.generateNewQrButton'));
    expect(onQrReset).toHaveBeenCalledTimes(1);
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type Chain } from '@/shared/core';
import { kusamaChain, polkadotChain } from '@/shared/mocks';
import { ThemeProvider } from '@/shared/ui-kit';
import { StepTransaction } from '../StepTransaction';

vi.mock('@/shared/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock('@/shared/ui-entities', () => ({
  ChainSelect: () => null,
}));

vi.mock('@/features/operation-templates', () => ({
  OperationTemplatesToolbar: () => null,
}));

vi.mock('@/features/extrinsic-builder', () => ({
  ExtrinsicBuilder: ({ chain }: { chain: Chain | null }) => (
    <div data-testid="builder">{chain ? `${chain.chainId}:${chain.assets[0]?.symbol}` : 'no-chain'}</div>
  ),
}));

const renderStep = (selectedChain: Chain) =>
  render(
    <ThemeProvider>
      <StepTransaction
        chains={[polkadotChain, kusamaChain]}
        selectedChain={selectedChain}
        inputMode="build"
        callData=""
        callDataError={null}
        decodedCallData={null}
        api={null}
        specVersion={null}
        onChainSelected={vi.fn()}
        onInputModeChanged={vi.fn()}
        onCallDataChanged={vi.fn()}
        onTemplateApply={vi.fn()}
      />
    </ThemeProvider>,
  );

describe('features/drafts/steps/StepTransaction', () => {
  it('SP-66: hands the selected network to the extrinsic builder so amounts use its own unit', () => {
    renderStep(kusamaChain);

    expect(screen.getByTestId('builder')).toHaveTextContent(`${kusamaChain.chainId}:KSM`);
  });

  it('SP-66: follows the network when the selection changes', () => {
    const { rerender } = renderStep(kusamaChain);

    rerender(
      <ThemeProvider>
        <StepTransaction
          chains={[polkadotChain, kusamaChain]}
          selectedChain={polkadotChain}
          inputMode="build"
          callData=""
          callDataError={null}
          decodedCallData={null}
          api={null}
          specVersion={null}
          onChainSelected={vi.fn()}
          onInputModeChanged={vi.fn()}
          onCallDataChanged={vi.fn()}
          onTemplateApply={vi.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('builder')).toHaveTextContent(`${polkadotChain.chainId}:DOT`);
  });
});

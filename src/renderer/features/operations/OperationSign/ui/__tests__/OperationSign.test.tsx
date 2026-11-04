import { fireEvent, render, screen } from '@testing-library/react';
import { type Scope, fork } from 'effector';
import { Provider } from 'effector-react';
import { MemoryRouter } from 'react-router-dom';

import { I18Provider } from '@/shared/i18n';
import { polkadotChain } from '@/shared/mocks';
import { signModel } from '../../model/sign-model';
import { OperationSign } from '../OperationSign';

// The signing UIs behind the switch need a wallet and a camera / extension /
// WalletConnect session; here only the gate in front of them is under test.
vi.mock('../SigningSwitch', () => ({
  SigningSwitch: () => <div data-testid="signing-switch" />,
}));

const TOO_HEAVY_TITLE = 'Operation is too large to sign';
const TOO_HEAVY_DESCRIPTION =
  'It doesn’t fit into a single transaction on Polkadot, and a multisig operation can’t be split into parts. Go back and include fewer items in the operation.';
const LOADING_TEXT = 'Preparing signing data...';

const renderSign = (scope: Scope) => {
  const onGoBack = vi.fn();

  render(
    <Provider value={scope}>
      <I18Provider>
        <MemoryRouter>
          <OperationSign onGoBack={onGoBack} />
        </MemoryRouter>
      </I18Provider>
    </Provider>,
  );

  return { onGoBack };
};

describe('OperationSign blocked screen', () => {
  it('SP-56: shows the too-heavy block for the chain with a Close button that goes back, and no sign content', () => {
    const scope = fork({
      values: new Map().set(signModel.$blocked, {
        reason: { kind: 'extrinsic-too-heavy', detail: 'multisig.asMulti' },
        chain: polkadotChain,
      }),
    });

    const { onGoBack } = renderSign(scope);

    const blocked = screen.getByRole('alert');
    expect(blocked).toHaveTextContent(TOO_HEAVY_TITLE);
    expect(blocked).toHaveTextContent(TOO_HEAVY_DESCRIPTION);

    expect(screen.queryByTestId('signing-switch')).not.toBeInTheDocument();
    expect(screen.queryByText(LOADING_TEXT)).not.toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveTextContent('Close');

    fireEvent.click(buttons[0]!);

    expect(onGoBack).toHaveBeenCalledTimes(1);
  });

  it('SP-56: waits for the signing data without any block while nothing is blocked', () => {
    const { onGoBack } = renderSign(fork());

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(TOO_HEAVY_TITLE)).not.toBeInTheDocument();
    expect(screen.getByText(LOADING_TEXT)).toBeInTheDocument();
    expect(onGoBack).not.toHaveBeenCalled();
  });
});

import { Keyring } from '@polkadot/keyring';
import { type KeyringPair } from '@polkadot/keyring/types';
import { TypeRegistry } from '@polkadot/types';
import { type ExtrinsicPayload } from '@polkadot/types/interfaces';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';

import { type HexString } from '@/shared/core';
import { ValidationErrors } from '@/shared/lib/utils';
import { type ExtrinsicSigningPayload, type SigningProps } from '../../lib/types';
import { Extension } from '../Extension';
import { PolkadotVault } from '../PolkadotVault';
import { WalletConnect } from '../WalletConnect';

const units = vi.hoisted(() => ({ values: new Map<unknown, unknown>() }));

const scanned = vi.hoisted(() => ({ payloads: [] as Uint8Array[], signatures: [] as HexString[] }));

vi.mock('effector-react', () => ({
  useGate: () => undefined,
  useUnit: (unit: unknown) => units.values.get(unit),
}));

vi.mock('@/shared/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock('@/shared/ui', () => ({
  Button: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  FootnoteText: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  SmallTitleText: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Loader: () => null,
  StatusModal: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="status-modal" /> : null),
}));

vi.mock('@/shared/ui/Animation/Animation', () => ({ Animation: () => null }));
vi.mock('@/shared/ui-entities', () => ({ WalletIcon: () => null }));
vi.mock('@/shared/ui-kit', () => ({
  Box: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Modal: Object.assign(() => null, { Content: () => null, Footer: () => null }),
}));
vi.mock('@/shared/lib/hooks', () => ({ useCountdown: () => [100, () => undefined] }));
vi.mock('@/features/wallet-connect-wallet-pairing', () => ({ WalletConnectQrCode: () => null }));
vi.mock('@/entities/wallet', () => ({ accountUtils: { isWcAccount: () => true } }));

vi.mock('../../model/operation-sign-model', () => ({ operationSignModel: { SignerGate: {} } }));
vi.mock('../../model/polkadotExtensionSign', () => ({
  polkadotExtensionSign: {
    flow: {},
    $step: 'ext-step',
    $signed: 'ext-signed',
    $signingCurrent: 'ext-current',
    $signingTotal: 'ext-total',
  },
}));
vi.mock('../../model/walletConnectSign', () => ({
  walletConnectSign: {
    flow: {},
    $transactions: 'wc-transactions',
    $pairingUri: 'wc-pairing',
    $step: 'wc-step',
    $signed: 'wc-signed',
    $error: 'wc-error',
    $chain: 'wc-chain',
  },
}));

vi.mock('@/entities/transaction/ui/QrCode/QrReader/useCameraAvailability', () => ({
  useCameraAvailability: () => ({ status: 'ready', retry: () => undefined }),
}));
vi.mock('@/entities/transaction/ui/Scanning/ScanMultiframeQr', () => ({
  ScanMultiframeQr: ({ onResult }: { onResult: (payloads: Uint8Array[]) => void }) => (
    <button onClick={() => onResult(scanned.payloads)}>scan-done</button>
  ),
}));
vi.mock('@/entities/transaction/ui/Scanning/ScanSingleframeQr', () => ({
  ScanSingleframeQr: ({ onResult }: { onResult: (payload: Uint8Array) => void }) => (
    <button onClick={() => onResult(scanned.payloads[0]!)}>scan-done</button>
  ),
}));
vi.mock('@/entities/transaction/ui/QrCode/QrReader/QrReaderWrapper', () => ({
  QrReaderWrapper: ({
    validationError,
    onResult,
  }: {
    validationError?: ValidationErrors;
    onResult: (value: HexString | HexString[]) => void;
  }) => (
    <>
      <button onClick={() => onResult(scanned.signatures.length === 1 ? scanned.signatures[0]! : scanned.signatures)}>
        signature-scanned
      </button>
      {validationError && <div data-testid="qr-error">{validationError}</div>}
    </>
  ),
}));

const ZERO_HASH = u8aToHex(new Uint8Array(32));
const registry = new TypeRegistry();

let alice: KeyringPair;
let bob: KeyringPair;

const createSigned = (pair: KeyringPair, methodLength: number, nonce: number) => {
  const payload = registry.createTypeUnsafe<ExtrinsicPayload>('ExtrinsicPayload', [
    {
      method: u8aToHex(new Uint8Array(methodLength).fill(7)),
      era: '0x00',
      nonce,
      tip: 0,
      specVersion: 1,
      transactionVersion: 1,
      genesisHash: ZERO_HASH,
      blockHash: ZERO_HASH,
    },
    { version: 4 },
  ]);

  return { payload: hexToU8a(payload.toHex()), signature: payload.sign(pair).signature as HexString };
};

const createSigningPayloads = (count: number) =>
  Array.from({ length: count }, () => ({
    chain: { chainId: '0x00', name: 'Test' },
    api: {},
    signatory: { accountId: u8aToHex(alice.publicKey), signingType: 'PARITY_SIGNER' },
    extrinsic: {},
  })) as unknown as ExtrinsicSigningPayload[];

const createProps = (count: number, balanceError?: ValidationErrors) => ({
  signingPayloads: createSigningPayloads(count),
  validateBalance: vi.fn(async () => balanceError),
  onGoBack: vi.fn(),
  onResult: vi.fn<SigningProps['onResult']>(),
});

const flush = () => act(async () => {});

beforeAll(async () => {
  await cryptoWaitReady();
  const keyring = new Keyring({ type: 'sr25519' });
  alice = keyring.addFromUri('//Alice');
  bob = keyring.addFromUri('//Bob');
});

beforeEach(() => {
  units.values.clear();
});

describe('Extension signature verification', () => {
  const renderExtension = (signed: ReturnType<typeof createSigned>[], props: ReturnType<typeof createProps>) => {
    units.values.set('ext-step', 'success');
    units.values.set(
      'ext-signed',
      signed.map(({ payload, signature }) => ({ signature, txPayload: { payload } })),
    );

    return render(<Extension {...props} />);
  };

  it('passes valid signatures on', async () => {
    const signed = [createSigned(alice, 40, 0), createSigned(alice, 20_000, 1)];
    const props = createProps(2);

    renderExtension(signed, props);
    await flush();

    expect(props.onResult).toHaveBeenCalledWith(
      signed.map((s) => s.signature),
      signed.map((s) => s.payload),
    );
  });

  it('stops when one signature of a batch is invalid', async () => {
    const signed = [createSigned(alice, 40, 0), createSigned(bob, 40, 1)];
    const props = createProps(2);

    renderExtension(signed, props);
    await flush();

    expect(props.onResult).not.toHaveBeenCalled();
    expect(screen.getByTestId('status-modal')).toBeInTheDocument();
  });

  it('shows the balance error for valid signatures', async () => {
    const props = createProps(1, ValidationErrors.INSUFFICIENT_BALANCE);

    renderExtension([createSigned(alice, 40, 0)], props);
    await flush();

    expect(props.onResult).not.toHaveBeenCalled();
    expect(screen.getByTestId('status-modal')).toBeInTheDocument();
  });
});

describe('WalletConnect signature verification', () => {
  const renderWalletConnect = (
    signed: ReturnType<typeof createSigned>[],
    props: ReturnType<typeof createProps>,
    signatures = signed.map((s) => s.signature),
  ) => {
    units.values.set('wc-step', 'success');
    units.values.set('wc-pairing', null);
    units.values.set('wc-error', null);
    units.values.set('wc-chain', null);
    units.values.set(
      'wc-transactions',
      signed.map(({ payload }) => ({ payload })),
    );
    units.values.set(
      'wc-signed',
      signatures.map((signature) => ({ signature })),
    );

    return render(<WalletConnect {...props} />);
  };

  it('passes valid signatures on', async () => {
    const signed = [createSigned(alice, 40, 0), createSigned(alice, 20_000, 1)];
    const props = createProps(2);

    renderWalletConnect(signed, props);
    await flush();

    expect(props.onResult).toHaveBeenCalledWith(
      signed.map((s) => s.signature),
      signed.map((s) => s.payload),
    );
  });

  it('stops when one signature of a batch is invalid', async () => {
    const signed = [createSigned(alice, 40, 0), createSigned(alice, 40, 1)];
    const props = createProps(2);

    renderWalletConnect(signed, props, [signed[0]!.signature, signed[0]!.signature]);
    await flush();

    expect(props.onResult).not.toHaveBeenCalled();
    expect(screen.getByTestId('status-modal')).toBeInTheDocument();
  });

  it('stops when fewer signatures than transactions come back', async () => {
    const signed = [createSigned(alice, 40, 0), createSigned(alice, 40, 1)];
    const props = createProps(2);

    renderWalletConnect(signed, props, [signed[0]!.signature]);
    await flush();

    expect(props.onResult).not.toHaveBeenCalled();
    expect(screen.getByTestId('status-modal')).toBeInTheDocument();
  });

  it('shows the balance error for valid signatures', async () => {
    const props = createProps(1, ValidationErrors.INSUFFICIENT_BALANCE_FOR_FEE);

    renderWalletConnect([createSigned(alice, 40, 0)], props);
    await flush();

    expect(props.onResult).not.toHaveBeenCalled();
    expect(screen.getByTestId('status-modal')).toBeInTheDocument();
  });
});

describe('PolkadotVault signature verification', () => {
  const scanAndSign = async (props: ReturnType<typeof createProps>) => {
    render(<PolkadotVault {...props} />);

    fireEvent.click(screen.getByText('scan-done'));
    fireEvent.click(screen.getByText('signature-scanned'));
    await flush();
  };

  it.each([40, 300, 20_000])('passes a valid single signature on for method of %i bytes', async (methodLength) => {
    const signed = createSigned(alice, methodLength, 0);
    scanned.payloads = [signed.payload];
    scanned.signatures = [signed.signature];
    const props = createProps(1);

    await scanAndSign(props);

    expect(props.onResult).toHaveBeenCalledWith([signed.signature], [signed.payload]);
  });

  it('passes a valid multi-signature batch on', async () => {
    const signed = [createSigned(alice, 40, 0), createSigned(alice, 20_000, 1), createSigned(alice, 300, 2)];
    scanned.payloads = signed.map((s) => s.payload);
    scanned.signatures = signed.map((s) => s.signature);
    const props = createProps(3);

    await scanAndSign(props);

    expect(props.onResult).toHaveBeenCalledWith(scanned.signatures, scanned.payloads);
  });

  it('stops when one signature of a multi-signature batch is invalid', async () => {
    const signed = [createSigned(alice, 40, 0), createSigned(alice, 40, 1)];
    scanned.payloads = signed.map((s) => s.payload);
    scanned.signatures = [signed[0]!.signature, signed[0]!.signature];
    const props = createProps(2);

    await scanAndSign(props);

    expect(props.onResult).not.toHaveBeenCalled();
    expect(screen.getByTestId('qr-error')).toHaveTextContent(String(ValidationErrors.INVALID_SIGNATURE));
  });

  it('stops when fewer signatures than payloads are scanned', async () => {
    const signed = [createSigned(alice, 40, 0), createSigned(alice, 40, 1), createSigned(alice, 40, 2)];
    scanned.payloads = signed.map((s) => s.payload);
    scanned.signatures = [signed[0]!.signature, signed[1]!.signature];
    const props = createProps(3);

    await scanAndSign(props);

    expect(props.onResult).not.toHaveBeenCalled();
    expect(screen.getByTestId('qr-error')).toHaveTextContent(String(ValidationErrors.INVALID_SIGNATURE));
  });
});

import { Keyring } from '@polkadot/keyring';
import { type KeyringPair } from '@polkadot/keyring/types';
import { u8aToHex } from '@polkadot/util';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';

import { type HexString } from '@/shared/core';
import { I18Provider } from '@/shared/i18n';
import { ValidationErrors } from '@/shared/lib/utils';
import { createExtrinsicPayload, createPayloadRegistry, signExtrinsicPayload } from '@/shared/mocks';
import { type ExtrinsicSigningPayload, type SigningProps } from '../../lib/types';
import { Extension } from '../Extension';
import { PolkadotVault } from '../PolkadotVault';
import { WalletConnect } from '../WalletConnect';

const INVALID_SIGNATURE_TEXT = 'Error occurred while decoding QR code. Scan again.';
const BALANCE_FOR_FEE_TEXT = 'Not enough tokens to pay for the network fee';

const units = vi.hoisted(() => ({ values: new Map<unknown, unknown>() }));

const scanned = vi.hoisted(() => ({ payloads: [] as Uint8Array[], signatures: [] as HexString[] }));

vi.mock('effector-react', () => ({
  useGate: () => undefined,
  useUnit: (unit: unknown) => units.values.get(unit),
}));

vi.mock('@/shared/ui/Animation/Animation', () => ({ Animation: () => null }));
vi.mock('@/shared/ui-entities', () => ({ WalletIcon: () => null }));
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

// Only the camera is replaced: the QR payload scanners hand over the prepared
// payloads, the signature readers the prepared signatures. `QrReaderWrapper`
// stays real, so the label under the scanner is what the user would read.
vi.mock('@/entities/transaction', async (importActual) => ({
  ...(await importActual<Record<string, unknown>>()),
  CameraAccessAlert: () => null,
  useCameraAvailability: () => ({ status: 'ready', retry: () => undefined }),
  ScanMultiframeQr: ({ onResult }: { onResult: (payloads: Uint8Array[]) => void }) => (
    <button onClick={() => onResult(scanned.payloads)}>scan-done</button>
  ),
  ScanSingleframeQr: ({ onResult }: { onResult: (payload: Uint8Array) => void }) => (
    <button onClick={() => onResult(scanned.payloads[0]!)}>scan-done</button>
  ),
}));
vi.mock('@/entities/transaction/ui/QrCode/QrReader/QrSignatureReader', () => ({
  QrSignatureReader: ({ onResult }: { onResult: (value: HexString) => void }) => (
    <button onClick={() => onResult(scanned.signatures[0]!)}>signature-scanned</button>
  ),
}));
vi.mock('@/entities/transaction/ui/QrCode/QrReader/QrMultiframeSignatureReader', () => ({
  QrMultiframeSignatureReader: ({ onResult }: { onResult: (value: HexString[]) => void }) => (
    <button onClick={() => onResult(scanned.signatures)}>signature-scanned</button>
  ),
}));

const registry = createPayloadRegistry();

let alice: KeyringPair;
let bob: KeyringPair;

const createSigned = (pair: KeyringPair, methodLength: number, nonce: number, withType = false) => {
  return signExtrinsicPayload(createExtrinsicPayload(registry, { methodLength, nonce }), pair, withType);
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

const renderWithI18n = (ui: ReactNode) => render(<I18Provider>{ui}</I18Provider>);

const flush = () => act(async () => {});

const expectNothingForwarded = (props: ReturnType<typeof createProps>) => {
  expect(props.onResult).not.toHaveBeenCalled();
  expect(props.onGoBack).not.toHaveBeenCalled();
};

const expectNoErrorShown = () => {
  expect(screen.queryByTestId('StatusModal')).not.toBeInTheDocument();
  expect(screen.queryByText(INVALID_SIGNATURE_TEXT)).not.toBeInTheDocument();
  expect(screen.queryByText(BALANCE_FOR_FEE_TEXT)).not.toBeInTheDocument();
};

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

    return renderWithI18n(<Extension {...props} />);
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

  it('SP-49: forwards valid extension signatures without an error modal', async () => {
    const signed = [createSigned(alice, 40, 0), createSigned(alice, 20_000, 1)];
    const props = createProps(2);

    renderExtension(signed, props);
    await flush();

    expect(props.onResult).toHaveBeenCalledTimes(1);
    expect(props.onResult).toHaveBeenCalledWith(
      signed.map((s) => s.signature),
      signed.map((s) => s.payload),
    );
    expect(props.onGoBack).not.toHaveBeenCalled();
    expectNoErrorShown();
  });

  it('stops when one signature of a batch is invalid', async () => {
    const signed = [createSigned(alice, 40, 0), createSigned(bob, 40, 1)];
    const props = createProps(2);

    renderExtension(signed, props);
    await flush();

    expect(props.onResult).not.toHaveBeenCalled();
    expect(screen.getByTestId('StatusModal')).toBeInTheDocument();
  });

  it('SP-49: shows the invalid-signature modal for a signature made by another key and forwards nothing', async () => {
    const payload = createExtrinsicPayload(registry, { methodLength: 40, nonce: 0 });
    const forged = signExtrinsicPayload(payload, bob);
    const props = createProps(1);

    renderExtension([forged], props);
    await flush();

    expectNothingForwarded(props);
    expect(props.validateBalance).not.toHaveBeenCalled();
    expect(screen.getByTestId('StatusModal')).toHaveTextContent(INVALID_SIGNATURE_TEXT);
  });

  it('shows the balance error for valid signatures', async () => {
    const props = createProps(1, ValidationErrors.INSUFFICIENT_BALANCE);

    renderExtension([createSigned(alice, 40, 0)], props);
    await flush();

    expect(props.onResult).not.toHaveBeenCalled();
    expect(screen.getByTestId('StatusModal')).toBeInTheDocument();
  });

  it('SP-51: shows the network fee balance error for valid extension signatures and forwards nothing', async () => {
    const props = createProps(1, ValidationErrors.INSUFFICIENT_BALANCE_FOR_FEE);

    renderExtension([createSigned(alice, 40, 0)], props);
    await flush();

    expectNothingForwarded(props);
    expect(props.validateBalance).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('StatusModal')).toHaveTextContent(BALANCE_FOR_FEE_TEXT);
    expect(screen.queryByText(INVALID_SIGNATURE_TEXT)).not.toBeInTheDocument();
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

    return renderWithI18n(<WalletConnect {...props} />);
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

  it('SP-49: forwards valid WalletConnect signatures without an error modal', async () => {
    const signed = [createSigned(alice, 40, 0), createSigned(alice, 20_000, 1)];
    const props = createProps(2);

    renderWalletConnect(signed, props);
    await flush();

    expect(props.onResult).toHaveBeenCalledTimes(1);
    expect(props.onResult).toHaveBeenCalledWith(
      signed.map((s) => s.signature),
      signed.map((s) => s.payload),
    );
    expect(props.onGoBack).not.toHaveBeenCalled();
    expectNoErrorShown();
  });

  it('stops when one signature of a batch is invalid', async () => {
    const signed = [createSigned(alice, 40, 0), createSigned(alice, 40, 1)];
    const props = createProps(2);

    renderWalletConnect(signed, props, [signed[0]!.signature, signed[0]!.signature]);
    await flush();

    expect(props.onResult).not.toHaveBeenCalled();
    expect(screen.getByTestId('StatusModal')).toBeInTheDocument();
  });

  it('SP-49: shows the invalid-signature modal for a signature over another transaction and forwards nothing', async () => {
    const signed = createSigned(alice, 40, 0);
    const other = createSigned(alice, 40, 1);
    const props = createProps(1);

    renderWalletConnect([signed], props, [other.signature]);
    await flush();

    expectNothingForwarded(props);
    expect(props.validateBalance).not.toHaveBeenCalled();
    expect(screen.getByTestId('StatusModal')).toHaveTextContent(INVALID_SIGNATURE_TEXT);
  });

  it('shows the balance error for valid signatures', async () => {
    const props = createProps(1, ValidationErrors.INSUFFICIENT_BALANCE_FOR_FEE);

    renderWalletConnect([createSigned(alice, 40, 0)], props);
    await flush();

    expect(props.onResult).not.toHaveBeenCalled();
    expect(screen.getByTestId('StatusModal')).toBeInTheDocument();
  });

  it('SP-51: shows the network fee balance error for valid WalletConnect signatures and forwards nothing', async () => {
    const props = createProps(1, ValidationErrors.INSUFFICIENT_BALANCE_FOR_FEE);

    renderWalletConnect([createSigned(alice, 40, 0)], props);
    await flush();

    expectNothingForwarded(props);
    expect(props.validateBalance).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('StatusModal')).toHaveTextContent(BALANCE_FOR_FEE_TEXT);
    expect(screen.queryByText(INVALID_SIGNATURE_TEXT)).not.toBeInTheDocument();
  });
});

describe('PolkadotVault signature verification', () => {
  const scanAndSign = async (props: ReturnType<typeof createProps>) => {
    renderWithI18n(<PolkadotVault {...props} />);

    fireEvent.click(screen.getByText('scan-done'));
    fireEvent.click(screen.getByText('signature-scanned'));
    await flush();
  };

  it('passes a valid single signature on', async () => {
    const signed = createSigned(alice, 300, 0);
    scanned.payloads = [signed.payload];
    scanned.signatures = [signed.signature];
    const props = createProps(1);

    await scanAndSign(props);

    expect(props.onResult).toHaveBeenCalledWith([signed.signature], [signed.payload]);
  });

  it('SP-47: forwards a valid single signature with no error under the scanner', async () => {
    const signed = createSigned(alice, 300, 0);
    scanned.payloads = [signed.payload];
    scanned.signatures = [signed.signature];
    const props = createProps(1);

    await scanAndSign(props);

    expect(props.onResult).toHaveBeenCalledTimes(1);
    expect(props.onResult).toHaveBeenCalledWith([signed.signature], [signed.payload]);
    expect(props.onGoBack).not.toHaveBeenCalled();
    expect(props.validateBalance).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(INVALID_SIGNATURE_TEXT)).not.toBeInTheDocument();
  });

  it('passes a valid multi-frame batch of type-prefixed signatures on', async () => {
    const signed = [
      createSigned(alice, 40, 0, true),
      createSigned(alice, 20_000, 1, true),
      createSigned(alice, 300, 2, true),
    ];
    scanned.payloads = signed.map((s) => s.payload);
    scanned.signatures = signed.map((s) => s.signature);
    const props = createProps(3);

    await scanAndSign(props);

    expect(props.onResult).toHaveBeenCalledWith(scanned.signatures, scanned.payloads);
  });

  it('SP-48: forwards one signature per part of a multi-frame batch with no error under the scanner', async () => {
    const signed = [
      createSigned(alice, 40, 0, true),
      createSigned(alice, 20_000, 1, true),
      createSigned(alice, 300, 2, true),
    ];
    scanned.payloads = signed.map((s) => s.payload);
    scanned.signatures = signed.map((s) => s.signature);
    const props = createProps(3);

    await scanAndSign(props);

    expect(props.onResult).toHaveBeenCalledTimes(1);
    const [signatures, payloads] = props.onResult.mock.calls[0]!;
    expect(signatures).toHaveLength(3);
    expect(payloads).toHaveLength(3);
    signed.forEach((part, index) => {
      expect(signatures[index]).toBe(part.signature);
      expect(payloads[index]).toBe(part.payload);
    });
    expect(props.onGoBack).not.toHaveBeenCalled();
    expect(screen.queryByText(INVALID_SIGNATURE_TEXT)).not.toBeInTheDocument();
  });

  it('stops when one signature of a multi-signature batch is invalid', async () => {
    const signed = [createSigned(alice, 40, 0), createSigned(alice, 40, 1)];
    scanned.payloads = signed.map((s) => s.payload);
    scanned.signatures = [signed[0]!.signature, signed[0]!.signature];
    const props = createProps(2);

    await scanAndSign(props);

    expect(props.onResult).not.toHaveBeenCalled();
    expect(screen.getByText(INVALID_SIGNATURE_TEXT)).toBeInTheDocument();
  });

  it('SP-50: refuses a signature QR produced for another transaction', async () => {
    const transactionA = createSigned(alice, 300, 0);
    const transactionB = createSigned(alice, 300, 1);
    scanned.payloads = [transactionA.payload];
    scanned.signatures = [transactionB.signature];
    const props = createProps(1);

    await scanAndSign(props);

    expectNothingForwarded(props);
    expect(props.validateBalance).not.toHaveBeenCalled();
    expect(screen.getByText(INVALID_SIGNATURE_TEXT)).toBeInTheDocument();
  });

  it('SP-50: refuses a signature made by another Vault key', async () => {
    const payload = createExtrinsicPayload(registry, { methodLength: 300, nonce: 0 });
    const signedByOther = signExtrinsicPayload(payload, bob);
    scanned.payloads = [signedByOther.payload];
    scanned.signatures = [signedByOther.signature];
    const props = createProps(1);

    await scanAndSign(props);

    expectNothingForwarded(props);
    expect(props.validateBalance).not.toHaveBeenCalled();
    expect(screen.getByText(INVALID_SIGNATURE_TEXT)).toBeInTheDocument();
  });

  it('SP-50: refuses a multi-frame result with fewer signatures than payloads', async () => {
    const signed = [createSigned(alice, 40, 0, true), createSigned(alice, 40, 1, true)];
    scanned.payloads = signed.map((s) => s.payload);
    scanned.signatures = [signed[0]!.signature];
    const props = createProps(2);

    await scanAndSign(props);

    expectNothingForwarded(props);
    expect(props.validateBalance).not.toHaveBeenCalled();
    expect(screen.getByText(INVALID_SIGNATURE_TEXT)).toBeInTheDocument();
  });
});

import { signatureVerify } from '@polkadot/util-crypto';
import { useRef, useState } from 'react';
import init, { Encoder } from 'raptorq';
import { hexToU8a, stringToU8a, u8aConcat, u8aToHex } from '@polkadot/util';
import { methods } from '@substrate/txwrapper-polkadot';
import { info } from 'autoprefixer';

import { QrReader, QrTxGenerator } from '@renderer/components/common';
import { Command } from '@renderer/components/common/QrCode/QrGenerator/common/constants';
import { VideoInput } from '@renderer/components/common/QrCode/QrReader/common/types';
import { Button, Input } from '@renderer/components/ui';
import {
  EXPORT_ADDRESS,
  SIGNED_TRANSACTION_BULK,
  TRANSACTION_BULK,
} from '@renderer/components/common/QrCode/QrReader/common/constants';
import QrMultiframeGenerator from '@renderer/components/common/QrCode/QrGenerator/QrMultiframeGenerator';
import { formatAmount } from '@renderer/services/balance/common/utils';
import {
  createMultipleTransactionSignedPayload,
  createSignPayload,
  createSignPayloadForMultipleTransactionSigning,
} from '@renderer/components/common/QrCode/QrGenerator/common/utils';
import { TransactionType } from '@renderer/services/transaction/common/types';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { useChains } from '@renderer/services/network/chainsService';
import { ConnectionType } from '@renderer/domain/connection';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import MultiframeSignatureQrReader from '@renderer/components/common/QrCode/QrReader/MultiframeSignatureQrReader';

const CameraDev = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [payload, setPayload] = useState<Uint8Array | string>();
  const [scannedData, setScannedData] = useState<Uint8Array>();
  const [encoder, setEncoder] = useState<Encoder>();
  const [multipleTransactions, setMultipleTransaction] = useState<Uint8Array>();

  const [availableCameras, setAvailableCameras] = useState<VideoInput[]>([]);
  const [activeCameraId, setActiveCameraId] = useState('');
  const { connections } = useNetworkContext();
  const { sortChains } = useChains();
  const { createPayload } = useTransaction();
  const sortedChains = sortChains(
    Object.values(connections).filter((c) => c.connection.connectionType !== ConnectionType.DISABLED),
  );
  const currentConnection = sortedChains.find(
    (c) => c.chainId == '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e',
  );

  const onSetPayload = () => {
    setPayload('<Bytes>hello test this is my message</Bytes>');
  };

  const onSetMultipleTransactions = async () => {
    //westend
    const payload1 = await createPayload(
      {
        address: '5DCg8K2gy6ThqxRY7QFNUVhogxSCoTMGw6TwPAy5wXXjhdcr',
        type: TransactionType.TRANSFER,
        args: {
          dest: '5EZegcM27RuogrSoTbJWYRWmyBqDMeNK92FXjwcsbPBHavoP',
          value: '1',
        },
      },
      currentConnection.api,
    );

    const payload2 = await createPayload(
      {
        address: '5FjpbccqasRmJ7eR2bGk3tMhYu8Qg4eNpa9J6ksF3umoPkqu',
        type: TransactionType.TRANSFER,
        args: {
          dest: '5EZegcM27RuogrSoTbJWYRWmyBqDMeNK92FXjwcsbPBHavoP',
          value: '1',
        },
      },
      currentConnection.api,
    );
    let transactions = [
      createSignPayloadForMultipleTransactionSigning(
        '5DCg8K2gy6ThqxRY7QFNUVhogxSCoTMGw6TwPAy5wXXjhdcr',
        Command.Transaction,
        payload1,
        '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e',
      ),
      createSignPayloadForMultipleTransactionSigning(
        '5FjpbccqasRmJ7eR2bGk3tMhYu8Qg4eNpa9J6ksF3umoPkqu',
        Command.Transaction,
        payload2,
        '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e',
      ),
    ];

    let transactionsEncoded = u8aConcat(TRANSACTION_BULK.encode({ TransactionBulk: 'V1', payload: transactions }));
    let bulk = createMultipleTransactionSignedPayload(transactionsEncoded);
    setMultipleTransaction(bulk);
    init().then(() => {
      let encoder = Encoder.with_defaults(bulk, 128);
      onEncoder(encoder);
    });
  };

  const onScannedData = (scannedData: Uint8Array) => {
    setScannedData(scannedData);
  };

  const onEncoder = (encoder: Encoder) => {
    setEncoder(encoder);
  };

  const onCheckSignature = () => {
    // Pavel's signature & address
    const signature =
      '0xd469609af86830c83972a4d05cf5c8641577ed74b17e3db247025da641f6cf0b02e681a9ffb3c1d558b1dbd8294c22a1863d91e231037aa099ac33d8a3825286';
    const address = '12YK3LD8FzVgyBuN6mQkCaZUHyExQdjyvX1Fn67DJ5A4rL2R';
    const verification = signatureVerify('hello test this is my message', signature, address);

    console.log('isValid ==> ', verification);
  };

  return (
    <div>
      {/* eslint-disable i18next/no-literal-string */}
      <h2>Camera Dev</h2>
      <div className="flex justify-between">
        <div>
          <p className="mt-3">List of available cameras:</p>
          {availableCameras.length > 0 ? (
            <ul className="mb-3">
              {availableCameras.map((c) => (
                <li key={c.id} className="flex gap-x-3">
                  <span>
                    {c.id} - {c.label}
                  </span>
                  <Button variant="outline" pallet="primary" onClick={() => setActiveCameraId(c.id)}>
                    Select
                  </Button>
                </li>
              ))}
              <li className="flex gap-x-3">
                <span>Test id - Test camera name</span>
                <Button variant="outline" pallet="primary" onClick={() => setActiveCameraId('121212')}>
                  Select
                </Button>
              </li>
            </ul>
          ) : (
            <p>No cameras found</p>
          )}
          <div className="flex justify-between">
            {/*<QrReader*/}
            {/*  cameraId={activeCameraId}*/}
            {/*  onCameraList={(cameras) => setAvailableCameras(cameras)}*/}
            {/*  onResult={(data) => {*/}
            {/*    console.info(data);*/}
            {/*    let bytes: Uint8Array = EXPORT_ADDRESS.encode({ ExportAddrs: 'V1', payload: data });*/}
            {/*    let bytes_standard = Uint8Array.of(0x53, 0xff, 0xde, ...bytes);*/}
            {/*    init().then(() => {*/}
            {/*      let encoder = Encoder.with_defaults(bytes_standard, 128);*/}
            {/*      onScannedData(bytes_standard);*/}
            {/*      onEncoder(encoder);*/}
            {/*    });*/}
            {/*  }}*/}
            {/*  onStart={() => console.info('start camera')}*/}
            {/*  onError={(error) => console.warn(error)}*/}
            {/*/>*/}
          </div>
          <div className="flex justify-between">
            <span>The same data that was just scanned</span>
            {scannedData && encoder && <QrMultiframeGenerator payload={scannedData} encoder={encoder} />}
          </div>
        </div>
        <div>
          <div className="flex gap-x-3 items-center mb-3">
            <Button weight="lg" variant="fill" pallet="alert" onClick={onCheckSignature}>
              Check Parity signature
            </Button>
            <Input placeholder="Address" ref={inputRef} />
            <Button weight="lg" variant="fill" pallet="primary" onClick={onSetPayload}>
              Set payload
            </Button>
          </div>
          {payload && (
            // Fast test with Westend genesisHash
            <QrTxGenerator
              cmd={Command.Message}
              address={inputRef.current?.value || ''}
              genesisHash="0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e"
              payload={payload}
              size={200}
            />
          )}
        </div>

        <div>
          <div className="flex justify-between">
            <Button weight="lg" variant="fill" pallet="primary" onClick={onSetMultipleTransactions}>
              Create multiple transaction signature
            </Button>
          </div>
          {multipleTransactions && encoder && (
            <QrMultiframeGenerator payload={multipleTransactions} size={200} encoder={encoder} />
          )}
        </div>
        <div>
          <div className="flex justify-between">
            <MultiframeSignatureQrReader
              cameraId={activeCameraId}
              onCameraList={(cameras) => setAvailableCameras(cameras)}
              onResult={(data) => {
                console.info(data);
              }}
              onStart={() => console.info('start camera')}
              onError={(error) => console.warn(error)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraDev;

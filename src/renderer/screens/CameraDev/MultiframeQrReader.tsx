// eslint-disable-next-line import/default
import QrScanner from 'qr-scanner';
import cn from 'classnames';
import { useEffect, useRef, useState } from 'react';
import { BrowserCodeReader, BrowserQRCodeReader } from '@zxing/browser';
import init, { Decoder, Encoder, EncodingPacket, RaptorqFrame } from 'raptorq';
import { int } from '@zxing/library/es2015/customTypings';
import {collective, scaleInfo} from '@polkadot/types/interfaces/definitions';
import { u8aToHex } from '@polkadot/util';

import { ErrorObject, QrError } from '../../components/common/QrCode/QrReader/common/types';
import { QR_READER_ERRORS } from '../../components/common/QrCode/QrReader/common/errors';
import { useI18n } from '@renderer/context/I18nContext';
import { Icon } from '@renderer/components/ui';
import {Codec} from "parity-scale-codec";
import * as $ from "parity-scale-codec";


type Props = {
  size?: number;
  cameraId?: string;
  onCameraList?: (cameras: QrScanner.Camera[]) => void;
  onResult: (data: string) => void;
  onStart?: () => void;
  onError?: (error: ErrorObject) => void;
};

//for decoding from scale encoded bytes to the TS object
interface AddrInfo {
  name: string;
  network: string;
  address: string;
  derivation_path: string | undefined;
  encryption: Encryption
}

//encryption enum
enum Encryption {
  Ed25519,
  Sr25519,
  Ecdsa,
  Ethereum,
}

const $encryption = $.u8 as $.Codec<Encryption>;

const $addr_info: Codec<AddrInfo> = $.object(
  ["name", $.str],
  ["address", $.str],
  ["network", $.str],
  ["derivation_path", $.option($.str)],
  ["encryption", $encryption],
);

//export address format for decoding. Rust enum is a tagged union.
const $export_address = $.taggedUnion("ExportAddrs", [["V1", ["addrs", $.array($addr_info)]]]);


const MultiframeQRReader = ({ size = 300, cameraId, onCameraList, onResult, onStart, onError }: Props) => {
  const { t } = useI18n();
  const codeReader = new BrowserQRCodeReader();
  const videoInputDevices = async () => {
    return await BrowserCodeReader.listVideoInputDevices();
  };
  videoInputDevices().then((x) => console.log(x));
  // choose your media device (webcam, frontal camera, back camera, etc.)

  const selectedDeviceId = '548f70c0a4f4e422895669d5a8d8aa512219126e1d41b1bd3c98eede896bf0e3';
  const videoRef = useRef<HTMLVideoElement>(null);

  //this object holds the progress of the multiframe scanning
  let inProgress = {
    length: -1,
    total: -1,
    collected: new Set(),
  };
  let packets = new Array<Uint8Array>();

  let status: int = 0;
  const decoder = async () =>
    await codeReader.decodeFromVideoDevice(selectedDeviceId, videoRef.current, (result, error, controls) => {
      if (result) {
        init().then(() => {
          let scanningResult = result.getResultMetadata().get(2) as [Uint8Array];
          if (scanningResult) {
            let frame;
            try {
              frame = RaptorqFrame.try_from(scanningResult[0]);
            } catch (e) {
              //if frame may not be recognized then it's a plain text, like `substrate:${address}:${wallet.publicKey}:Ff`
              console.log(`text in the result is ${result.getText()}`);

              return;
            } //non text result
            if (frame) {
              //if frame was recognized it has to be processed
              let length = frame.size();
              let total = frame.total();
              let newPacket = frame.payload();
              let decodedPacket = EncodingPacket.deserialize(newPacket);
              let blockNumber = decodedPacket.encoding_symbol_id();
              let raptorDecoder = Decoder.with_defaults(BigInt(length), decodedPacket.data().length);
              packets.push(newPacket);
              if (status == 0) {
                //if it's the first frame from the multiframe QR
                let fountainResult = raptorDecoder.decode(newPacket);
                if (fountainResult) {
                  //try to decode the 1st frame. Maybe it's a single frame QR.
                  console.log(`result ${u8aToHex(fountainResult)}`);
                  let res = $export_address.decode(fountainResult);
                  console.log(res);
                  status = 0;
                  packets = [];
                } else {
                  //if there are more then 1 frame proceed scanning and keep the progress
                  status = 1;
                  inProgress = {
                    length,
                    total,
                    collected: new Set(),
                  };
                  inProgress.collected.add(blockNumber);
                }
              } else if (status == 1) {
                //check if the user has started to scan another QR code.
                if (inProgress.length != length) {
                  console.error(`This is conflicted payload ${inProgress.length} ${length}`);
                }
                //collect new frame
                inProgress.collected.add(blockNumber);
                console.log(`added ${inProgress.collected.size} and total is ${inProgress.total}`);
                for (let i = 0; i < packets.length; i++) {
                  //try to decode data.
                  let fountainResult = raptorDecoder.decode(packets[i]);
                  if (fountainResult) {
                    //if data was decoded show it and finish scanning
                    console.log(`result ${u8aToHex(fountainResult)}`);
                    let res = $export_address.decode(fountainResult);
                    console.log(res);
                    status = 0;
                    packets = [];
                    inProgress = {
                      length: -1,
                      total: -1,
                      collected: new Set(),
                    };
                    break;
                  }
                }
              }
            }
          }
        });
      }
    });
  decoder();

  return (
    <div className="flex flex-col" data-testid="qr-reader">
      <div className="relative rounded-3xl after:absolute after:inset-0 after:rounded-3xl after:border-4 after:border-shade-70/20">
        <video
          muted
          autoPlay
          controls={false}
          ref={videoRef}
          className="rounded-3xl bg-shade-60 object-cover -scale-x-100"
          style={{ width: size + 'px', height: size + 'px' }}
        >
          {t('qrReader.videoError')}
        </video>
      </div>
    </div>
  );
};

export default MultiframeQRReader;

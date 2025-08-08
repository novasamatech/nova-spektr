import qrcode from 'qrcode-generator';

// HACK The default function take string -> number[], the Uint8array is compatible
// with that signature and the use thereof
// @ts-expect-error hack
qrcode.stringToBytes = (data: Uint8Array): Uint8Array => data;

const AUTO_DETECT_SIZE = 0;
const ERROR_CORRECTION_LEVEL = 'M';
const CELL_SIZE = 2;
const CELL_MARGIN = 0;

export function createQrImage(data: Uint8Array, bgColor = 'none', qrColor = 'black') {
  const qr = qrcode(AUTO_DETECT_SIZE, ERROR_CORRECTION_LEVEL);
  qr.addData(data as unknown as string, 'Byte');
  qr.make();

  const svgTag = qr.createSvgTag(CELL_SIZE, CELL_MARGIN);

  return svgTag
    .replace(/width="\d+px"/, 'width="100%"')
    .replace(/height="\d+px"/, 'height="100%"')
    .replace(/white/, bgColor)
    .replace(/black/, qrColor);
}

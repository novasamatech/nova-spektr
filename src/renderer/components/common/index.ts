import FallbackScreen from './FallbackScreen/FallbackScreen';
import QrReader from './QrCode/QrReader/QrReader';
import QrSignatureReader from './QrCode/QrReader/QrSignatureReader';
import QrTextGenerator from './QrCode/QrGenerator/QrTextGenerator';
import { QrTxGenerator } from './QrCode/QrGenerator/QrTxGenerator';
import Header from './Header/Header';
import QrGeneratorContainer from './QrCode/QrGeneratorContainer/QrGeneratorContainer';
import ExtrinsicExplorers from './ExtrinsicExplorers/ExtrinsicExplorers';
import { OperationTitle } from './OperationTitle/OperationTitle';

// FIXME: SignatoryCard, AddressWithExplorers, ScanMultiframeQr and ScanSingleframeQr exported separately.
// Adding them to this file causes to crash all tests which use anything from that file
// similar issue on stackoverflow:
// https://stackoverflow.com/questions/49156356/why-does-jest-try-to-resolve-every-component-in-my-index-ts

export {
  FallbackScreen,
  QrReader,
  QrSignatureReader,
  QrTextGenerator,
  QrGeneratorContainer,
  QrTxGenerator,
  Header,
  ExtrinsicExplorers,
  OperationTitle,
};

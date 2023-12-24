import ExtrinsicExplorers from './ExtrinsicExplorers/ExtrinsicExplorers';
import { OperationTitle } from './OperationTitle/OperationTitle';

// FIXME: SignatoryCard, AddressWithExplorers, ScanMultiframeQr and ScanSingleframeQr exported separately.
// Adding them to this file causes to crash all tests which use anything from that file
// similar issue on stackoverflow:
// https://stackoverflow.com/questions/49156356/why-does-jest-try-to-resolve-every-component-in-my-index-ts

export { ExtrinsicExplorers, OperationTitle };

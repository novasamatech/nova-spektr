import FallbackScreen from './FallbackScreen/FallbackScreen';
import QrReader from './QrCode/QrReader/QrReader';
import QrSignatureReader from './QrCode/QrReader/QrSignatureReader';
import QrTextGenerator from './QrCode/QrGenerator/QrTextGenerator';
import QrTxGenerator from './QrCode/QrGenerator/QrTxGenerator';
import ActiveAddress from './ActiveAddress/ActiveAddress';
import Explorers from './Explorers/Explorers';
import Message from './Message/Message';
import Expandable from './Expandable/Expandable';
import Deposit from './Deposit/Deposit';
import Badge from './Badge/Badge';
import Fee from './Fee/Fee';
import Header from './Header/Header';
import ExplorerLink from './ExplorerLink/ExplorerLink';
import BalanceNew from './BalanceNew/BalanceNew';
import AccountAddress from './AccountAddress/AccountAddress';
import AddressWithName from './AddressWithName/AddressWithName';
import QrGeneratorContainer from './QrCode/QrGeneratorContainer/QrGeneratorContainer';
import DetailRow from '@renderer/components/common/DetailRow/DetailRow';
import ExtrinsicExplorers from './ExtrinsicExplorers/ExtrinsicExplorers';

// SignatoryCard, AddressWithExplorers, ScanMultiframeQr and ScanSingleframeQr exported separately.
// Adding them to this file causes to crash all tests which use anything from that file
// similar issue on stackoverflow:
// https://stackoverflow.com/questions/49156356/why-does-jest-try-to-resolve-every-component-in-my-index-ts

export {
  FallbackScreen,
  ActiveAddress,
  QrReader,
  QrSignatureReader,
  QrTextGenerator,
  QrGeneratorContainer,
  QrTxGenerator,
  Explorers,
  Expandable,
  Deposit,
  Message,
  Badge,
  Fee,
  Header,
  ExplorerLink,
  BalanceNew,
  AccountAddress,
  AddressWithName,
  DetailRow,
  ExtrinsicExplorers,
};

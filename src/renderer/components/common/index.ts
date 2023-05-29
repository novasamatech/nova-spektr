import AccountsList from './AccountsList/AccountsList';
import AddressOnPlate from './AddressOnPlate/AddressOnPlate';
import FallbackScreen from './FallbackScreen/FallbackScreen';
import SplashScreen from './SplashScreen/SplashScreen';
import QrReader from './QrCode/QrReader/QrReader';
import QrSignatureReader from './QrCode/QrReader/QrSignatureReader';
import QrTextGenerator from './QrCode/QrGenerator/QrTextGenerator';
import ValidatorsTable from './ValidatorsTable/ValidatorsTable';
import StakingActions from './StakingActions/StakingActions';
import QrTxGenerator from './QrCode/QrGenerator/QrTxGenerator';
import ActiveAddress from './ActiveAddress/ActiveAddress';
import ChainLoader from './ChainLoader/ChainLoader';
import Explorers from './Explorers/Explorers';
import Message from './Message/Message';
import Expandable from './Expandable/Expandable';
import Deposit from './Deposit/Deposit';
import Badge from './Badge/Badge';
import Fee from './Fee/Fee';
import ExplorerLink from './ExplorerLink/ExplorerLink';
import BalanceNew from './BalanceNew/BalanceNew';
import AccountAddress from './AccountAddress/AccountAddress';
import AddressWithName from './AddressWithName/AddressWithName';

// SignatoryCard and AddressWithExplorers exported separately.
// Adding them to this file causes to crash all tests which use anything from that file
// similar issue on stackoverflow:
// https://stackoverflow.com/questions/49156356/why-does-jest-try-to-resolve-every-component-in-my-index-ts

export {
  AccountsList,
  AddressOnPlate,
  FallbackScreen,
  ActiveAddress,
  SplashScreen,
  QrReader,
  QrSignatureReader,
  QrTextGenerator,
  ValidatorsTable,
  StakingActions,
  QrTxGenerator,
  ChainLoader,
  Explorers,
  Expandable,
  Deposit,
  Message,
  Badge,
  Fee,
  ExplorerLink,
  BalanceNew,
  AccountAddress,
  AddressWithName,
};

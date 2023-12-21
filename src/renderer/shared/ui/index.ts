import Input from './Inputs/Input/Input';
import Plate from './Plate/Plate';
import PasswordInput from './Inputs/PasswordInput/PasswordInput';
import InputHint from './InputHint/InputHint';
import Button from './Buttons/Button/Button';
import ButtonLink from './Buttons/ButtonLink/ButtonLink';
import ButtonBack from './Buttons/ButtonBack/ButtonBack';
import InfoPopover from './Popovers/InfoPopover/InfoPopover';
import InfoLink from './InfoLink/InfoLink';
import Select from './Dropdowns/Select/Select';
import Combobox from './Dropdowns/Combobox/Combobox';
import RadioGroup from './RadioGroup/RadioGroup';
import PopoverLink from './PopoverLink/PopoverLink';
import Checkbox from './Checkbox/Checkbox';
import MultiSelect from './Dropdowns/MultiSelect/MultiSelect';
import MenuPopover from './Popovers/MenuPopover/MenuPopover';
import SearchInput from './Inputs/SearchInput/SearchInput';
import Accordion from './Accordion/Accordion';
import Alert from './Alert/Alert';
import Counter from './Counter/Counter';
import StatusLabel from './StatusLabel/StatusLabel';
import InputFile from './Inputs/InputFile/InputFile';
import InputArea from './Inputs/InputArea/InputArea';
import Switch from './Switch/Switch';
import Icon from './Icon/Icon';
import Identicon from './Identicon/Identicon';
import LanguageSwitcher from './LanguageSwitcher/LanguageSwitcher';
import Shimmering from './Shimmering/Shimmering';
import Duration from './Duration/Duration';
import Loader from './Loader/Loader';
import DetailRow from './DetailRow/DetailRow';
export { AmountInput } from './Inputs/AmountInput/AmountInput';
export { BaseModal } from './Modals/BaseModal/BaseModal';
export { ConfirmModal } from './Modals/ConfirmModal/ConfirmModal';
export { StatusModal } from './Modals/StatusModal/StatusModal';
export { Popover } from './Popovers/Popover/Popover';
export { ExplorerLink } from './ExplorerLink/ExplorerLink';
export { ContextMenu } from './ContextMenu/ContextMenu';
export { DropdownButton } from './Dropdowns/DropdownButton/DropdownButton';
export { DropdownIconButton } from './Dropdowns/DropdownIconButton/DropdownIconButton';
export { Tooltip } from './Popovers/Tooltip/Tooltip';
export { LabelHelpBox } from './LabelHelpbox/LabelHelpBox';
export { MainLayout } from './Layouts/MainLayout/MainLayout';
export { Truncate } from './Truncate/Truncate';
export { Countdown } from './Countdown/Countdown';
export { Tabs } from './Tabs/Tabs';
export { IconButton } from './Buttons/IconButton/IconButton';
export {
  LargeTitleText,
  TitleText,
  SmallTitleText,
  CaptionText,
  HeadlineText,
  BodyText,
  FootnoteText,
  LabelText,
  HeaderTitleText,
  HelpText,
} from './Typography';

// FIXME: Animation component exported separately.
// Adding them to this file causes to crash all tests which use anything from that file
// similar issue on stackoverflow: https://stackoverflow.com/questions/49156356/why-does-jest-try-to-resolve-every-component-in-my-index-ts

export {
  Input,
  Plate,
  PasswordInput,
  SearchInput,
  InputHint,
  Button,
  ButtonLink,
  ButtonBack,
  InfoPopover,
  MenuPopover,
  InfoLink,
  Select,
  Combobox,
  PopoverLink,
  Checkbox,
  RadioGroup,
  MultiSelect,
  Alert,
  Accordion,
  Counter,
  StatusLabel,
  InputFile,
  InputArea,
  Switch,
  Icon,
  Identicon,
  LanguageSwitcher,
  Shimmering,
  Duration,
  Loader,
  DetailRow,
};

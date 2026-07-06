export { type OperationTitle, operationTitleTransformer } from './components/Operation';
export { operationDetailsSlot } from './components/OperationFullInfo';
export { operationOverviewSlot } from './components/OperationSignatories';
export { OperationIcon, operationIconTransformer } from './components/OperationIcon';
export { OperationActions } from './components/OperationActions';
export { confirmTransactionInfoSlot } from './components/ActionSteps/Confirmation';
export { Operations } from './components/Operations';
export { Search } from './components/Search';
export { SignatorySelectModal } from './components/modals/SignatorySelectModal';
export { OperationsFilter } from './components/OperationsFilter';
export { ExportButton } from './components/ExportButton';

export { type TabFilter, operationsContextModel } from './model/context';
export { multisigOperationsFeature } from './model/feature';
export { deepLinkModel } from './model/deep-link';
export { exportModel } from './model/export';

export { type TransferAmountInfo, extractTransferAmount } from './lib/transfer-amount-extractor';
export { type ProxyEditInfo, isProxyEditOperation, parseProxyEditOperation } from './lib/proxy-edit';
export { type VerifyProxyOpInfo, isVerifyProxyOperation, parseVerifyProxyOperation } from './lib/verify-proxy-op';

// Side-effect import: registers the proxy-edit details panel into operationDetailsSlot.
import './model/proxy-edit-details-feature';
// Side-effect import: registers the verify-proxy details panel into operationDetailsSlot.
// The two panels are mutually exclusive at the data level — each renders null when its
// own parser fails, so only the matching one shows.
import './model/verify-proxy-details-feature';

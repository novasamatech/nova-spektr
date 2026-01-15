import { multisigOperationService } from '@/domains/network';

export { operationLogTitleTransformer } from './components/LogModal';
export { operationDetailsSlot } from './components/OperationFullInfo';
export { operationIconTransformer } from './components/OperationIcon';
export { confirmTransactionInfoSlot } from './components/ActionSteps/Confirmation';
export { Operations } from './components/Operations';
export { SignatorySelectModal } from './components/modals/SignatorySelectModal';

// Re-export from domain for backwards compatibility
export { type OperationTitle } from '@/domains/network';
export const operationTitleTransformer = multisigOperationService.operationTitleTransformer;

export { multisigOperationsFeature } from './model/feature';
export { deepLinkModel } from './model/deep-link';

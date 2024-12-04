import { operationDetailsSlot, operationTitleSlot } from './components/OperationsList';
import { operationsModel } from './model/list';

export const multisigOperationsFeature = {
  model: {
    operations: operationsModel,
  },
  views: {},
  slots: {
    operationDetails: operationDetailsSlot,
    operationTitle: operationTitleSlot,
  },
};

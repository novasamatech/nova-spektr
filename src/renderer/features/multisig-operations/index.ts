import { logTitleSlot, operationDetailsSlot, operationTitleSlot } from './components/Operation';
import { operationsModel } from './model/list';

export const multisigOperationsFeature = {
  model: {
    operations: operationsModel,
  },
  views: {},
  slots: {
    operationDetails: operationDetailsSlot,
    operationTitle: operationTitleSlot,
    logTitle: logTitleSlot,
  },
};

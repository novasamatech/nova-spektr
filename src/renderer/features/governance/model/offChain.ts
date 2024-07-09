import { createForm } from 'effector-forms';
import { sample, createEvent, combine, createStore } from 'effector';

import { governanceModel, type SourceType } from '@entities/governance';

const flowStarted = createEvent();
const flowClosed = createEvent();

const $isFlowStarted = createStore(false).reset(flowClosed);

const $offChainForm = createForm({
  fields: {
    source: {
      init: '' as SourceType,
      rules: [
        {
          name: 'required',
          errorText: 'governance.offChainDataSource.sourceError',
          validator: Boolean,
        },
      ],
    },
  },
  validateOn: ['submit'],
});

const $canSubmit = combine(
  {
    isValid: $offChainForm.$isValid,
    newSource: $offChainForm.fields.source.$value,
    oldSource: governanceModel.$governanceApi,
  },
  ({ isValid, newSource, oldSource }) => {
    return isValid && newSource !== oldSource?.type;
  },
);

sample({
  clock: flowStarted,
  fn: () => true,
  target: $isFlowStarted,
});

sample({
  clock: flowStarted,
  source: governanceModel.$governanceApi,
  fn: (governanceApi) => ({
    source: governanceApi?.type || 'polkassembly',
  }),
  target: $offChainForm.setInitialForm,
});

sample({
  clock: $offChainForm.formValidated,
  fn: ({ source }) => source,
  target: [governanceModel.events.governanceApiChanged, flowClosed],
});

export const offChainModel = {
  $offChainForm,
  $isFlowStarted,
  $canSubmit,

  events: {
    flowStarted,
  },
  output: {
    flowClosed,
  },
};

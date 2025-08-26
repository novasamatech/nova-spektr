import { combine, createEvent, createStore, sample } from 'effector';
import { createForm } from 'effector-forms';
import { t } from 'i18next';

import { type GovernanceApiSource } from '@/aggregates/governance-meta-provider';
import { governanceMetaProvider } from '@/aggregates/governance-meta-provider';

const flowStarted = createEvent();
const flowClosed = createEvent();

const $isFlowStarted = createStore(false).reset(flowClosed);

const $offChainForm = createForm({
  fields: {
    source: {
      init: '' as GovernanceApiSource,
      rules: [
        {
          name: 'required',
          errorText: t('governance.offChainDataSource.sourceError'),
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
    oldSource: governanceMetaProvider.$metaProvider,
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
  source: governanceMetaProvider.$metaProvider,
  fn: (governanceApi) => ({
    source: governanceApi?.type || 'polkassembly',
  }),
  target: $offChainForm.setInitialForm,
});

sample({
  clock: $offChainForm.formValidated,
  fn: ({ source }) => source,
  target: [governanceMetaProvider.changeProvider, flowClosed],
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

import { allSettled, fork } from 'effector';
import { describe, expect, it } from 'vitest';

import { nominateConfirmModel } from '@/features/operations/OperationsConfirm';
import { Step } from '../lib/types';

import { nominateFlow } from './flow';
import { nominateFlowShards } from './flow-shards';

describe.each([
  ['nominateFlow', nominateFlow],
  ['nominateFlowShards', nominateFlowShards],
])('%s · sign request outside the confirm step', (_, flow) => {
  it('stays idle when the flow is not running', async () => {
    const scope = fork();

    await allSettled(nominateConfirmModel.startSigning, { scope });

    expect(scope.getState(flow.$step)).toBe(Step.NONE);
  });

  it('stays on the current step before confirmation', async () => {
    const scope = fork();

    await allSettled(flow.events.stepChanged, { scope, params: Step.VALIDATORS });
    await allSettled(nominateConfirmModel.startSigning, { scope });

    expect(scope.getState(flow.$step)).toBe(Step.VALIDATORS);
  });
});

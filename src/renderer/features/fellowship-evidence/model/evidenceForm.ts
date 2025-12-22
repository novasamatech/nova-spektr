import { createEffect, createEvent, createStore, merge, restore, sample } from 'effector';
import { createForm } from 'effector-forms';
import { createGate } from 'effector-react';
import { t } from 'i18next';

import { type HexString } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { evidenceService } from '@/domains/collectives';

// flow

const skipUploading = createEvent();
const skipUploadingWithWish = createEvent<'Promotion' | 'Retention'>();
const setFlowType = createEvent<'fromScratch' | 'ipfsUpload' | null>();

const flow = createGate<{ wish: 'Promotion' | 'Retention' | null }>({ defaultState: { wish: null } });
const $wish = flow.state.map(x => x.wish);
const $evidence = createStore<HexString | null>(null);
const $flowType = restore(setFlowType, null);

// requests

type PostParams = {
  wish: 'Promotion' | 'Retention' | null;
  document: string;
};

const postEvidenceFx = createEffect(async ({ wish, document }: PostParams) => {
  const file = new File([document], `evidence-${wish}.txt`, {
    type: 'text/plain',
  });
  const formData = new FormData();
  formData.append('file', file);

  const url = evidenceService.getEvidenceUploadIpfsUrl();

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    credentials: 'same-origin',
  });

  const json = await response.json();

  if (response.status >= 400) {
    throw new Error(json.message);
  }

  return String(json.cid);
});

// form

type Form = {
  areas: string;
  evidence: string;
  comments: string;
};

const form = createForm<Form>({
  fields: {
    areas: {
      init: '',
      rules: [
        {
          name: 'required',
          errorText: t('fellowship.salary.evidenceForm.areas.required'),
          validator: v => v.trim().length > 0,
        },
      ],
    },
    evidence: {
      init: '',
      rules: [
        {
          name: 'required',
          errorText: t('fellowship.salary.evidenceForm.evidence.required'),
          validator: v => v.trim().length > 0,
        },
      ],
    },
    comments: {
      init: '',
      rules: [
        {
          name: 'required',
          errorText: t('fellowship.salary.evidenceForm.comments.required'),
          validator: v => v.trim().length > 0,
        },
      ],
    },
  },
  validateOn: ['submit'],
});

const $formattedMarkdown = form.$values.map(({ areas, evidence, comments }) => {
  return `
# Areas of work
${areas}

# Evidence
${evidence}

# Comments
${comments}
`;
});

sample({
  clock: $formattedMarkdown.updates,
  fn: () => null,
  target: $evidence,
});

// upload flow

const $uploadError = createStore('');

sample({
  clock: form.$values,
  fn() {
    return '';
  },
  target: $uploadError,
});

sample({
  clock: form.formValidated,
  source: { evidence: $evidence, document: $formattedMarkdown, wish: $wish },
  filter: ({ evidence }) => nullable(evidence),
  target: postEvidenceFx,
});

sample({
  clock: form.formValidated,
  source: { evidence: $evidence, wish: $wish },
  filter: ({ evidence }) => nonNullable(evidence),
  fn: data => data.wish!,
  target: skipUploadingWithWish,
});

sample({
  clock: $evidence.updates,
  source: { evidence: $evidence, wish: $wish },
  filter: ({ evidence, wish }) => nonNullable(evidence) && nonNullable(wish),
  fn: ({ wish }) => wish!,
  target: skipUploadingWithWish,
});

sample({
  clock: skipUploadingWithWish,
  target: skipUploading,
});

sample({
  clock: postEvidenceFx.failData,
  fn: error => error.message,
  target: $uploadError,
});

sample({
  clock: postEvidenceFx.doneData,
  fn: evidenceService.getEvidenceFromCid,
  target: $evidence,
});

const postEvidenceDoneWithWish = postEvidenceFx.done.map(result => result.params.wish);

const evidenceUploaded = merge([postEvidenceDoneWithWish, skipUploadingWithWish]);

// reset

sample({
  clock: flow.close,
  fn: () => null,
  target: [$evidence, $uploadError, form.reset],
});

export const evidenceForm = {
  flow,
  form,
  $wish,
  $evidence,
  $formattedMarkdown,
  $uploadError,
  $flowType,
  post: postEvidenceFx,
  reset: form.reset,
  setFlowType,
  evidenceUploaded,
};

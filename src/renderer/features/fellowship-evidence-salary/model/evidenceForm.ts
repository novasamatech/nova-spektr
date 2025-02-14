import { createEffect, createStore, sample } from 'effector';
import { createForm } from 'effector-forms';

import { createFlow } from '@/shared/effector';
import { evidenceService } from '@/domains/collectives';

// flow

const flow = createFlow<{ wish: 'Promotion' | 'Retention' | null }>({ wish: null });
const $wish = flow.state.map(x => x.wish);

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

  return json.cid as string;
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
          errorText: 'fellowship.salary.evidenceForm.areas.required',
          validator: v => v.trim().length > 0,
        },
      ],
    },
    evidence: {
      init: '',
      rules: [
        {
          name: 'required',
          errorText: 'fellowship.salary.evidenceForm.evidence.required',
          validator: v => v.trim().length > 0,
        },
      ],
    },
    comments: {
      init: '',
      rules: [
        {
          name: 'required',
          errorText: 'fellowship.salary.evidenceForm.comments.required',
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

// upload flow

const $evidenceHex = createStore<string | null>(null);
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
  source: { document: $formattedMarkdown, wish: $wish },
  target: postEvidenceFx,
});

sample({
  clock: postEvidenceFx.failData,
  fn: error => error.message,
  target: $uploadError,
});

sample({
  clock: postEvidenceFx.doneData,
  fn: evidenceService.getEvidenceFromCid,
  target: $evidenceHex,
});

// steps

const $step = createStore<'form' | 'submit'>('form');

sample({
  clock: flow.open,
  fn: () => 'form' as const,
  target: $step,
});

sample({
  clock: flow.open,
  fn: () => 'form' as const,
  target: $step,
});

sample({
  clock: postEvidenceFx.done,
  fn: () => 'submit' as const,
  target: $step,
});

export const evidenceForm = {
  flow,
  form,
  $step,
  $formattedMarkdown,
  $uploadError,
  $posting: postEvidenceFx,
};

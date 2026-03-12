import { createEffect, createEvent, createStore, restore, sample } from 'effector';

import { type HexString } from '@/shared/core';
import { evidenceService } from '@/domains/collectives';

type IPFSParams = {
  hash: string;
};

type FileUploadParams = {
  file: File;
};

type IPFSStep = 'closed' | 'upload' | 'preview';

type IPFSPendingData = {
  type: 'file' | 'hash';
  file?: File;
  hash?: string;
  content?: string;
};

const fetchIPFSContentFx = createEffect(async ({ hash }: IPFSParams) => {
  let cid = hash;

  if (hash.startsWith('http://') || hash.startsWith('https://')) {
    const url = new URL(hash);
    const pathParts = url.pathname.split('/');
    cid = pathParts[pathParts.length - 1]!;
  }

  const evidence = evidenceService.getEvidenceFromCid(cid);
  const ipfsUrl = evidenceService.getEvidenceIpfsUrl(evidence);

  const response = await fetch(ipfsUrl.toString());

  if (!response.ok) {
    throw new Error('Failed to fetch evidence from IPFS');
  }

  const content = await response.text();

  return { evidence, content };
});

const uploadFileToIPFSFx = createEffect(async ({ file }: FileUploadParams) => {
  const fileContent = await file.text();

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

  return { cid: String(json.cid), content: fileContent };
});

const startFlow = createEvent();
const setStep = createEvent<IPFSStep>();
const reset = createEvent();
const setPendingData = createEvent<IPFSPendingData | null>();

const $step = restore(setStep, 'closed' satisfies IPFSStep);
const $evidence = createStore<HexString | null>(null);
const $fileContent = createStore<string | null>(null);
const $uploadError = createStore<string>('');
const $pendingData = restore(setPendingData, null);

sample({
  clock: startFlow,
  fn: (): IPFSStep => 'upload',
  target: $step,
});

sample({
  clock: fetchIPFSContentFx.doneData,
  fn: ({ evidence }) => evidence,
  target: $evidence,
});

sample({
  clock: fetchIPFSContentFx.doneData,
  fn: ({ content }) => content,
  target: $fileContent,
});

sample({
  clock: fetchIPFSContentFx.doneData,
  fn: (): IPFSStep => 'preview',
  target: $step,
});

sample({
  clock: fetchIPFSContentFx.failData,
  fn: error => error.message,
  target: $uploadError,
});

sample({
  clock: uploadFileToIPFSFx.doneData,
  fn: ({ cid }) => {
    const evidence = evidenceService.getEvidenceFromCid(cid);
    return evidence;
  },
  target: $evidence,
});

sample({
  clock: uploadFileToIPFSFx.doneData,
  fn: ({ content }) => content,
  target: $fileContent,
});

sample({
  clock: uploadFileToIPFSFx.failData,
  fn: error => error.message,
  target: $uploadError,
});

sample({
  clock: setPendingData,
  fn: data => data?.content || null,
  target: $fileContent,
});

sample({
  clock: setPendingData,
  filter: data => data !== null,
  fn: (): IPFSStep => 'preview',
  target: $step,
});

sample({
  clock: reset,
  fn: (): IPFSStep => 'closed',
  target: $step,
});

sample({
  clock: reset,
  fn: () => null,
  target: [$evidence, $fileContent, $pendingData],
});

sample({
  clock: reset,
  fn: () => '',
  target: $uploadError,
});

export const evidenceIPFS = {
  $step,
  $evidence,
  $fileContent,
  $uploadError,
  $pendingData,
  fetchIPFSContent: fetchIPFSContentFx,
  uploadFileToIPFS: uploadFileToIPFSFx,
  startFlow,
  setStep,
  setPendingData,
  reset,
};

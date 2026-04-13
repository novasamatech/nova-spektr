import { type ApiPromise } from '@polkadot/api';
import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { readonly, throttle } from 'patronum';

import { encodeCallData, getCallMeta, getCallNames, getPalletNames, parseCallData } from '../lib/extrinsicBuilder';
import { type CallArgDef, type CallMeta } from '../lib/types';

// Events

const setApi = createEvent<ApiPromise | null>();
const palletChanged = createEvent<string | null>();
const callChanged = createEvent<string | null>();
const paramValueChanged = createEvent<{ name: string; value: unknown }>();
const resetBuilder = createEvent();
const populateFromCallData = createEvent<string>();

// Stores

const $api = createStore<ApiPromise | null>(null);
const $pallet = createStore<string | null>(null);
const $call = createStore<string | null>(null);
const $paramValues = createStore<Record<string, unknown>>({});
const $builtCallData = createStore<string | null>(null);
const $encodingError = createStore<string | null>(null);

// Derived stores

const $palletOptions = $api.map((api) => (api ? getPalletNames(api) : []));

const $callOptions = combine($api, $pallet, (api, pallet) => {
  if (!api || !pallet) return [];

  return getCallNames(api, pallet);
});

const $callMeta = combine({ api: $api, pallet: $pallet, call: $call }, ({ api, pallet, call }): CallMeta | null => {
  if (!api || !pallet || !call) return null;

  return getCallMeta(api, pallet, call);
});

const $callArgDefs = $callMeta.map((meta): CallArgDef[] => meta?.args ?? []);

const $callDocs = $callMeta.map((meta): string[] => meta?.docs ?? []);

// Effects

const encodeCallDataFx = createEffect(
  ({
    api,
    pallet,
    call,
    paramValues,
    argDefs,
  }: {
    api: ApiPromise;
    pallet: string;
    call: string;
    paramValues: Record<string, unknown>;
    argDefs: CallArgDef[];
  }): string | null => {
    const args = argDefs.map((def) => paramValues[def.name]);

    return encodeCallData(api, pallet, call, args, argDefs);
  },
);

// Wiring: setApi → $api + reset state

sample({
  clock: setApi,
  target: $api,
});

sample({
  clock: setApi,
  fn: () => null,
  target: [$pallet, $call, $builtCallData, $encodingError],
});

sample({
  clock: setApi,
  fn: () => ({}),
  target: $paramValues,
});

// Wiring: palletChanged → $pallet + reset call/params

sample({
  clock: palletChanged,
  target: $pallet,
});

sample({
  clock: palletChanged,
  fn: () => null,
  target: [$call, $builtCallData, $encodingError],
});

sample({
  clock: palletChanged,
  fn: () => ({}),
  target: $paramValues,
});

// Wiring: callChanged → $call + reset params

sample({
  clock: callChanged,
  target: $call,
});

sample({
  clock: callChanged,
  fn: () => null,
  target: [$builtCallData, $encodingError],
});

sample({
  clock: callChanged,
  fn: () => ({}),
  target: $paramValues,
});

// Wiring: paramValueChanged → update $paramValues

sample({
  clock: paramValueChanged,
  source: $paramValues,
  fn: (params, { name, value }) => ({ ...params, [name]: value }),
  target: $paramValues,
});

// Wiring: throttled paramValues → encode call data

const $throttledParamValues = createStore<Record<string, unknown>>({});

sample({
  clock: throttle($paramValues, 500),
  target: $throttledParamValues,
});

sample({
  clock: $throttledParamValues,
  source: { api: $api, pallet: $pallet, call: $call, argDefs: $callArgDefs },
  filter: ({ api, pallet, call }) => api !== null && pallet !== null && call !== null,
  fn: ({ api, pallet, call, argDefs }, paramValues) => ({
    api: api!,
    pallet: pallet!,
    call: call!,
    paramValues,
    argDefs,
  }),
  target: encodeCallDataFx,
});

sample({
  clock: encodeCallDataFx.doneData,
  target: $builtCallData,
});

sample({
  clock: encodeCallDataFx.doneData,
  fn: () => null,
  target: $encodingError,
});

sample({
  clock: encodeCallDataFx.fail,
  fn: ({ error }) => error.message,
  target: $encodingError,
});

sample({
  clock: encodeCallDataFx.fail,
  fn: () => null,
  target: $builtCallData,
});

// Wiring: populateFromCallData — parse hex and populate builder

const parseCallDataFx = createEffect(({ api, callDataHex }: { api: ApiPromise; callDataHex: string }) => {
  return parseCallData(api, callDataHex);
});

sample({
  clock: populateFromCallData,
  source: $api,
  filter: (api) => api !== null,
  fn: (api, callDataHex) => ({ api: api!, callDataHex }),
  target: parseCallDataFx,
});

sample({
  clock: parseCallDataFx.doneData,
  filter: (result) => result !== null,
  fn: (result) => result!.pallet,
  target: $pallet,
});

sample({
  clock: parseCallDataFx.doneData,
  filter: (result) => result !== null,
  fn: (result) => result!.call,
  target: $call,
});

sample({
  clock: parseCallDataFx.doneData,
  filter: (result) => result !== null,
  fn: (result) => result!.args,
  target: $paramValues,
});

// Wiring: resetBuilder (preserves $api — it's bound to chain, not builder state)

sample({
  clock: resetBuilder,
  fn: () => null,
  target: [$pallet, $call, $builtCallData, $encodingError],
});

sample({
  clock: resetBuilder,
  fn: () => ({}),
  target: $paramValues,
});

export const builderModel = {
  // Stores (readonly)
  $api: readonly($api),
  $pallet: readonly($pallet),
  $call: readonly($call),
  $palletOptions: readonly($palletOptions),
  $callOptions: readonly($callOptions),
  $callArgDefs: readonly($callArgDefs),
  $callDocs: readonly($callDocs),
  $paramValues: readonly($paramValues),
  $builtCallData: readonly($builtCallData),
  $encodingError: readonly($encodingError),

  // Events
  setApi,
  palletChanged,
  callChanged,
  paramValueChanged,
  resetBuilder,
  populateFromCallData,
};

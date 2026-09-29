import { type ApiPromise } from '@polkadot/api';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type Chain } from '@/shared/core';
import { useDebouncedCallback } from '@/shared/lib/hooks';
import {
  encodeCallData,
  getCallMeta,
  getCallNames,
  getPalletNames,
  parseCallData,
  resolveAmountUnit,
} from '../lib/extrinsicBuilder';
import { type CallMeta } from '../lib/types';

type UseExtrinsicBuilderParams = {
  api: ApiPromise | null;
  chain: Chain | null;
  onCallDataChange?: (callData: string | null) => void;
  /** CallData hex to sync from (single source of truth: form.fields.callData) */
  initialCallData?: string;
};

export function useExtrinsicBuilder({ api, chain, onCallDataChange, initialCallData }: UseExtrinsicBuilderParams) {
  const [pallet, setPallet] = useState<string | null>(null);
  const [call, setCall] = useState<string | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, unknown>>({});
  const [encodingError, setEncodingError] = useState<string | null>(null);

  // Track our own output to distinguish external changes from feedback
  const lastOutputRef = useRef<string | null>(null);
  const onCallDataChangeRef = useRef(onCallDataChange);
  onCallDataChangeRef.current = onCallDataChange;

  // Sync from initialCallData — only when it's an EXTERNAL change (not our own encode output).
  // On remount (after Confirm) lastOutputRef is null → always parses.
  // On tab switch (Paste→Build with different hex) → parses.
  // On own encode → matches lastOutputRef → skips.
  useEffect(() => {
    if (!api || !initialCallData || !initialCallData.startsWith('0x')) return;
    if (initialCallData === lastOutputRef.current) return;

    // Mark as processed IMMEDIATELY — prevents re-parse loop when encode fails
    lastOutputRef.current = initialCallData;

    const parsed = parseCallData(api, initialCallData, chain);
    if (parsed) {
      setPallet(parsed.pallet);
      setCall(parsed.call);
      setParamValues(parsed.args);
    }
  }, [api, chain, initialCallData]);

  // Derived

  const palletOptions = useMemo(() => (api ? getPalletNames(api) : []), [api]);

  const callOptions = useMemo(() => {
    if (!api || !pallet) return [];

    return getCallNames(api, pallet);
  }, [api, pallet]);

  const callMeta: CallMeta | null = useMemo(() => {
    if (!api || !pallet || !call) return null;

    return getCallMeta(api, pallet, call);
  }, [api, pallet, call]);

  // Recomputed on every value change: an asset amount's unit follows the asset id argument
  const amountUnit = useMemo(
    () => resolveAmountUnit({ chain, pallet, method: call, args: paramValues }),
    [chain, pallet, call, paramValues],
  );

  const callArgDefs = callMeta?.args ?? [];
  const callDocs = callMeta?.docs ?? [];

  // Encode with debounce — refs keep the callback stable across paramValues changes
  const paramValuesRef = useRef(paramValues);
  paramValuesRef.current = paramValues;

  const debouncedEncode = useDebouncedCallback(500, () => {
    if (!api || !pallet || !call || !callMeta) return;

    try {
      const values = paramValuesRef.current;
      const args = callMeta.args.map((def) => values[def.name]);
      const unit = resolveAmountUnit({ chain, pallet, method: call, args: values });
      const encoded = encodeCallData(api, pallet, call, args, callMeta.args, unit);
      lastOutputRef.current = encoded;
      setEncodingError(encoded ? null : 'Failed to encode');
      if (encoded) {
        onCallDataChangeRef.current?.(encoded);
      }
    } catch (e) {
      lastOutputRef.current = null;
      setEncodingError(e instanceof Error ? e.message : 'Encoding failed');
    }
  });

  useEffect(() => {
    debouncedEncode();
  }, [api, chain, pallet, call, callMeta, paramValues]);

  // Actions

  const handlePalletChange = useCallback((newPallet: string | null) => {
    setPallet(newPallet);
    setCall(null);
    setParamValues({});
    setEncodingError(null);
    lastOutputRef.current = null;
  }, []);

  const handleCallChange = useCallback((newCall: string | null) => {
    setCall(newCall);
    setParamValues({});
    setEncodingError(null);
    lastOutputRef.current = null;
  }, []);

  const handleParamChange = useCallback((name: string, value: unknown) => {
    setParamValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const reset = useCallback(() => {
    setPallet(null);
    setCall(null);
    setParamValues({});
    setEncodingError(null);
    lastOutputRef.current = null;
  }, []);

  return {
    pallet,
    call,
    paramValues,
    encodingError,
    amountUnit,
    palletOptions,
    callOptions,
    callArgDefs,
    callDocs,
    handlePalletChange,
    handleCallChange,
    handleParamChange,
    reset,
  };
}

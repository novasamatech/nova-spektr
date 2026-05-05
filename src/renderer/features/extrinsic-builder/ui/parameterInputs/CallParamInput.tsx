import { type ApiPromise } from '@polkadot/api';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { FootnoteText } from '@/shared/ui';
import { Box, Combobox, Input } from '@/shared/ui-kit';
import { useComboboxFilter } from '../../hooks/useComboboxFilter';
import { encodeCallData, getCallMeta, getCallNames, getPalletNames, parseCallData } from '../../lib/extrinsicBuilder';
import { type CallMeta, MAX_BUILDER_DEPTH } from '../../lib/types';
import { ParameterField } from '../ParameterField';

type Props = {
  api: ApiPromise | null;
  value: string;
  onChange: (value: string) => void;
  depth: number;
};

export const CallParamInput = memo(({ api, value, depth, onChange }: Props) => {
  const { t } = useI18n();

  if (depth >= MAX_BUILDER_DEPTH) {
    return (
      <Box direction="column" gap={1}>
        <FootnoteText className="text-text-tertiary">{t('extrinsicBuilder.depthLimitReached')}</FootnoteText>
        <Input height="sm" value={value} placeholder="0x..." onChange={onChange} />
      </Box>
    );
  }

  return <NestedBuilder api={api} value={value} depth={depth} onChange={onChange} />;
});

type NestedBuilderProps = {
  api: ApiPromise | null;
  value: string;
  onChange: (value: string) => void;
  depth: number;
};

const NestedBuilder = memo(({ api, value: hexValue, depth, onChange }: NestedBuilderProps) => {
  const [pallet, setPallet] = useState<string | null>(null);
  const [call, setCall] = useState<string | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, unknown>>({});
  const [restored, setRestored] = useState(false);

  // Restore nested builder state from hex on remount (e.g. back from Confirm).
  // Only runs once on first render with api available — subsequent hexValue
  // changes come from user edits and must not clobber the in-progress input.
  useEffect(() => {
    if (restored || !api) return;
    setRestored(true);
    if (!hexValue || !hexValue.startsWith('0x')) return;
    const parsed = parseCallData(api, hexValue);
    if (parsed) {
      setPallet(parsed.pallet);
      setCall(parsed.call);
      setParamValues(parsed.args);
    }
  }, [api, hexValue, restored]);

  const palletOptions = useMemo(() => (api ? getPalletNames(api) : []), [api]);
  const callOptions = useMemo(() => (api && pallet ? getCallNames(api, pallet) : []), [api, pallet]);
  const callMeta: CallMeta | null = useMemo(
    () => (api && pallet && call ? getCallMeta(api, pallet, call) : null),
    [api, pallet, call],
  );

  const handlePalletChange = useCallback((newPallet: string) => {
    setPallet(newPallet);
    setCall(null);
    setParamValues({});
  }, []);

  const handleCallChange = useCallback((newCall: string) => {
    setCall(newCall);
    setParamValues({});
  }, []);

  const handleParamChange = useCallback(
    (name: string, paramValue: unknown) => {
      setParamValues((prev) => {
        const updated = { ...prev, [name]: paramValue };

        if (api && pallet && call && callMeta) {
          const args = callMeta.args.map((def) => updated[def.name]);
          const encoded = encodeCallData(api, pallet, call, args, callMeta.args);
          if (encoded) {
            onChange(encoded);
          }
        }

        return updated;
      });
    },
    [api, pallet, call, callMeta, onChange],
  );

  return (
    <div className="border-border-default flex flex-col gap-y-2 rounded-md border p-3">
      <NestedCombobox
        options={palletOptions}
        value={pallet}
        placeholder="extrinsicBuilder.palletPlaceholder"
        onChange={handlePalletChange}
      />
      <NestedCombobox
        options={callOptions}
        value={call}
        disabled={!pallet}
        placeholder="extrinsicBuilder.callPlaceholder"
        onChange={handleCallChange}
      />

      {callMeta?.args.map((arg) => (
        <ParameterField
          key={arg.name}
          name={arg.name}
          typeDef={arg.typeDef}
          value={paramValues[arg.name]}
          depth={depth + 1}
          api={api}
          onChange={(val) => handleParamChange(arg.name, val)}
        />
      ))}
    </div>
  );
});

type NestedComboboxProps = {
  options: string[];
  value: string | null;
  disabled?: boolean;
  placeholder: string;
  onChange: (value: string) => void;
};

const NestedCombobox = memo(({ options, value, disabled, placeholder, onChange }: NestedComboboxProps) => {
  const { t } = useI18n();
  const { filteredOptions, displayValue, handleChange, handleBlur, handleInput } = useComboboxFilter(
    options,
    value,
    onChange,
  );

  return (
    <Combobox
      placeholder={t(placeholder)}
      value={displayValue}
      disabled={disabled}
      onBlur={handleBlur}
      onChange={handleChange}
      onInput={handleInput}
    >
      {filteredOptions.map((name) => (
        <Combobox.Item key={name} value={name}>
          {name}
        </Combobox.Item>
      ))}
    </Combobox>
  );
});

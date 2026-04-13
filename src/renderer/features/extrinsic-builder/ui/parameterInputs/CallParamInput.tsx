import { type ApiPromise } from '@polkadot/api';
import { memo, useCallback, useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { FootnoteText } from '@/shared/ui';
import { Box, Combobox, Input } from '@/shared/ui-kit';
import { encodeCallData, getCallMeta, getCallNames, getPalletNames } from '../../lib/extrinsicBuilder';
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

const NestedBuilder = memo(({ api, value: _value, depth, onChange }: NestedBuilderProps) => {
  const [pallet, setPallet] = useState<string | null>(null);
  const [call, setCall] = useState<string | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, unknown>>({});

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
      const updated = { ...paramValues, [name]: paramValue };
      setParamValues(updated);

      if (api && pallet && call && callMeta) {
        const args = callMeta.args.map((def) => updated[def.name]);
        const encoded = encodeCallData(api, pallet, call, args, callMeta.args);
        if (encoded) {
          onChange(encoded);
        }
      }
    },
    [api, pallet, call, callMeta, paramValues, onChange],
  );

  return (
    <div className="border-border-default flex flex-col gap-y-2 rounded-md border p-3">
      <NestedPalletSelect options={palletOptions} value={pallet} onChange={handlePalletChange} />
      <NestedCallSelect options={callOptions} value={call} disabled={!pallet} onChange={handleCallChange} />

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

type NestedSelectProps = {
  options: string[];
  value: string | null;
  disabled?: boolean;
  onChange: (value: string) => void;
};

const NestedPalletSelect = memo(({ options, value, onChange }: NestedSelectProps) => {
  const { t } = useI18n();
  const [inputText, setInputText] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const filtered = useMemo(() => {
    if (!isEditing || !inputText) return options;
    const lower = inputText.toLowerCase();

    return options.filter((name) => name.toLowerCase().includes(lower));
  }, [options, inputText, isEditing]);

  const displayValue = isEditing ? inputText : (value ?? '');

  const handleChange = useCallback(
    (v: string) => {
      if (options.includes(v)) {
        onChange(v);
        setIsEditing(false);
        setInputText('');
      } else {
        setInputText(v);
      }
    },
    [options, onChange],
  );

  return (
    <Combobox
      placeholder={t('extrinsicBuilder.palletPlaceholder')}
      value={displayValue}
      onBlur={() => {
        setIsEditing(false);
        setInputText('');
      }}
      onChange={handleChange}
      onInput={(v) => {
        setIsEditing(true);
        setInputText(v);
      }}
    >
      {filtered.map((name) => (
        <Combobox.Item key={name} value={name}>
          {name}
        </Combobox.Item>
      ))}
    </Combobox>
  );
});

const NestedCallSelect = memo(({ options, value, disabled, onChange }: NestedSelectProps) => {
  const { t } = useI18n();
  const [inputText, setInputText] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const filtered = useMemo(() => {
    if (!isEditing || !inputText) return options;
    const lower = inputText.toLowerCase();

    return options.filter((name) => name.toLowerCase().includes(lower));
  }, [options, inputText, isEditing]);

  const displayValue = isEditing ? inputText : (value ?? '');

  const handleChange = useCallback(
    (v: string) => {
      if (options.includes(v)) {
        onChange(v);
        setIsEditing(false);
        setInputText('');
      } else {
        setInputText(v);
      }
    },
    [options, onChange],
  );

  return (
    <Combobox
      placeholder={t('extrinsicBuilder.callPlaceholder')}
      value={displayValue}
      disabled={disabled}
      onBlur={() => {
        setIsEditing(false);
        setInputText('');
      }}
      onChange={handleChange}
      onInput={(v) => {
        setIsEditing(true);
        setInputText(v);
      }}
    >
      {filtered.map((name) => (
        <Combobox.Item key={name} value={name}>
          {name}
        </Combobox.Item>
      ))}
    </Combobox>
  );
});

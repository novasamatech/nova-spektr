import { type ApiPromise } from '@polkadot/api';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { FootnoteText } from '@/shared/ui';
import { Field, TextArea } from '@/shared/ui-kit';
import { type ParameterTypeDef } from '../lib/types';

import { AccountParamInput } from './parameterInputs/AccountParamInput';
import { BalanceParamInput } from './parameterInputs/BalanceParamInput';
import { BoolParamInput } from './parameterInputs/BoolParamInput';
import { CallParamInput } from './parameterInputs/CallParamInput';
import { EnumParamInput } from './parameterInputs/EnumParamInput';
import { NumberParamInput } from './parameterInputs/NumberParamInput';
import { OptionParamInput } from './parameterInputs/OptionParamInput';
import { StructParamInput } from './parameterInputs/StructParamInput';
import { TextParamInput } from './parameterInputs/TextParamInput';
import { TupleParamInput } from './parameterInputs/TupleParamInput';
import { VecParamInput } from './parameterInputs/VecParamInput';

type Props = {
  name: string;
  typeDef: ParameterTypeDef;
  value: unknown;
  onChange: (value: unknown) => void;
  depth: number;
  api: ApiPromise | null;
};

type OptionValue = { enabled: boolean; inner: unknown };
type EnumValue = { variant: string; values: Record<string, unknown> };

function isOptionValue(val: unknown): val is OptionValue {
  return typeof val === 'object' && val !== null && 'enabled' in val;
}

function isEnumValue(val: unknown): val is EnumValue {
  return typeof val === 'object' && val !== null && 'variant' in val;
}

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

const KIND_HINTS: Record<string, string> = {
  balance: 'extrinsicBuilder.balanceHint',
  accountId: 'extrinsicBuilder.accountHint',
};

export const ParameterField = memo(({ name, typeDef, value, onChange, depth, api }: Props) => {
  const { t } = useI18n();

  const hintKey = KIND_HINTS[typeDef.kind];
  const kindHint = hintKey ? ` (${t(hintKey)})` : '';
  const label = `${name}: ${typeDef.typeName}${kindHint}`;

  return (
    <Field text={<FootnoteText className="text-text-secondary">{label}</FootnoteText>}>
      <ParameterInput typeDef={typeDef} value={value} depth={depth} api={api} onChange={onChange} />
    </Field>
  );
});

type InputProps = {
  typeDef: ParameterTypeDef;
  value: unknown;
  onChange: (value: unknown) => void;
  depth: number;
  api: ApiPromise | null;
};

const ParameterInput = memo(({ typeDef, value, onChange, depth, api }: InputProps) => {
  switch (typeDef.kind) {
    case 'primitive': {
      if (typeDef.primitiveType === 'bool') {
        return <BoolParamInput value={Boolean(value)} onChange={onChange} />;
      }

      const isText = typeDef.primitiveType === 'string' || typeDef.primitiveType === 'bytes';

      if (!isText) {
        return <NumberParamInput value={String(value ?? '')} onChange={onChange} />;
      }

      return <TextParamInput value={String(value ?? '')} onChange={onChange} />;
    }

    case 'accountId':
      return <AccountParamInput value={String(value ?? '')} api={api} onChange={onChange} />;

    case 'balance':
      return <BalanceParamInput value={String(value ?? '')} api={api} onChange={onChange} />;

    case 'compact':
      if (typeDef.inner) {
        return <ParameterInput typeDef={typeDef.inner} value={value} depth={depth} api={api} onChange={onChange} />;
      }

      return <NumberParamInput value={String(value ?? '')} onChange={onChange} />;

    case 'option':
      return (
        <OptionParamInput
          typeDef={typeDef}
          value={isOptionValue(value) ? value : { enabled: false, inner: '' }}
          depth={depth}
          api={api}
          onChange={onChange}
        />
      );

    case 'vec':
      return (
        <VecParamInput
          typeDef={typeDef}
          value={Array.isArray(value) ? value : []}
          depth={depth}
          api={api}
          onChange={onChange}
        />
      );

    case 'enum':
      return (
        <EnumParamInput
          typeDef={typeDef}
          value={isEnumValue(value) ? value : { variant: '', values: {} }}
          depth={depth}
          api={api}
          onChange={onChange}
        />
      );

    case 'struct':
      return (
        <StructParamInput
          typeDef={typeDef}
          value={isRecord(value) ? value : {}}
          depth={depth}
          api={api}
          onChange={onChange}
        />
      );

    case 'tuple':
      return (
        <TupleParamInput
          typeDef={typeDef}
          value={isRecord(value) ? value : {}}
          depth={depth}
          api={api}
          onChange={onChange}
        />
      );

    case 'call':
      return <CallParamInput api={api} value={String(value ?? '')} depth={depth} onChange={onChange} />;

    case 'unknown':
    default:
      return <TextArea value={String(value ?? '')} placeholder={typeDef.typeName} rows={2} onChange={onChange} />;
  }
});

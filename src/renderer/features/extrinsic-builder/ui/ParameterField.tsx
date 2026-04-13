import { type ApiPromise } from '@polkadot/api';
import { useUnit } from 'effector-react';
import { memo } from 'react';

import { FootnoteText } from '@/shared/ui';
import { Field, TextArea } from '@/shared/ui-kit';
import { type ParameterTypeDef } from '../lib/types';
import { builderModel } from '../model/builder';

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
  api?: ApiPromise | null;
};

export const ParameterField = memo(({ name, typeDef, value, onChange, depth, api: apiProp }: Props) => {
  const apiFromModel = useUnit(builderModel.$api);
  const api = apiProp ?? apiFromModel;

  const kindHint = typeDef.kind === 'balance' ? ' (Balance)' : typeDef.kind === 'accountId' ? ' (Account)' : '';
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
      return <AccountParamInput value={String(value ?? '')} onChange={onChange} />;

    case 'balance':
      return <BalanceParamInput value={String(value ?? '')} onChange={onChange} />;

    case 'compact':
      if (typeDef.inner) {
        return <ParameterInput typeDef={typeDef.inner} value={value} depth={depth} api={api} onChange={onChange} />;
      }

      return <NumberParamInput value={String(value ?? '')} onChange={onChange} />;

    case 'option':
      return (
        <OptionParamInput
          typeDef={typeDef}
          value={(value as { enabled: boolean; inner: unknown }) ?? { enabled: false, inner: '' }}
          depth={depth}
          onChange={onChange}
        />
      );

    case 'vec':
      return (
        <VecParamInput typeDef={typeDef} value={Array.isArray(value) ? value : []} depth={depth} onChange={onChange} />
      );

    case 'enum':
      return (
        <EnumParamInput
          typeDef={typeDef}
          value={(value as { variant: string; values: Record<string, unknown> }) ?? { variant: '', values: {} }}
          depth={depth}
          onChange={onChange}
        />
      );

    case 'struct':
      return (
        <StructParamInput
          typeDef={typeDef}
          value={(value as Record<string, unknown>) ?? {}}
          depth={depth}
          onChange={onChange}
        />
      );

    case 'tuple':
      return (
        <TupleParamInput
          typeDef={typeDef}
          value={(value as Record<string, unknown>) ?? {}}
          depth={depth}
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

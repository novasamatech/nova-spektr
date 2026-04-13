import { type ApiPromise } from '@polkadot/api';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { FootnoteText, Icon } from '@/shared/ui';
import { Box, Tooltip } from '@/shared/ui-kit';
import { useExtrinsicBuilder } from '../hooks/useExtrinsicBuilder';

import { CallSelect } from './CallSelect';
import { PalletSelect } from './PalletSelect';
import { ParameterField } from './ParameterField';

type Props = {
  api: ApiPromise | null;
  onCallDataChange?: (callData: string | null) => void;
  initialCallData?: string;
};

export const ExtrinsicBuilder = memo(({ api, onCallDataChange, initialCallData }: Props) => {
  const { t } = useI18n();

  const builder = useExtrinsicBuilder({ api, onCallDataChange, initialCallData });

  return (
    <Box direction="column" gap={3}>
      <PalletSelect options={builder.palletOptions} value={builder.pallet} onChange={builder.handlePalletChange} />
      <div className="flex items-end gap-x-2">
        <div className="flex-1">
          <CallSelect
            options={builder.callOptions}
            value={builder.call}
            disabled={!builder.pallet}
            onChange={builder.handleCallChange}
          />
        </div>
        {builder.call && builder.callDocs.length > 0 && (
          <div className="mb-2">
            <Tooltip side="right">
              <Tooltip.Trigger>
                <div tabIndex={0}>
                  <Icon name="info" className="cursor-pointer hover:text-icon-hover" size={16} />
                </div>
              </Tooltip.Trigger>
              <Tooltip.Content>{builder.callDocs.join(' ')}</Tooltip.Content>
            </Tooltip>
          </div>
        )}
      </div>

      {builder.callArgDefs.length > 0 && (
        <Box direction="column" gap={2}>
          {builder.callArgDefs.map((arg) => (
            <ParameterField
              key={arg.name}
              name={arg.name}
              typeDef={arg.typeDef}
              value={builder.paramValues[arg.name]}
              depth={0}
              api={api}
              onChange={(value) => builder.handleParamChange(arg.name, value)}
            />
          ))}
        </Box>
      )}

      {builder.encodingError && (
        <FootnoteText className="text-text-negative">{t('extrinsicBuilder.encodingError')}</FootnoteText>
      )}
    </Box>
  );
});

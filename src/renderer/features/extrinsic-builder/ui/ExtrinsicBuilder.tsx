import { useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { FootnoteText, Icon } from '@/shared/ui';
import { Box, Tooltip } from '@/shared/ui-kit';
import { builderModel } from '../model/builder';

import { CallSelect } from './CallSelect';
import { PalletSelect } from './PalletSelect';
import { ParameterField } from './ParameterField';

export const ExtrinsicBuilder = memo(() => {
  const { t } = useI18n();

  const callArgDefs = useUnit(builderModel.$callArgDefs);
  const callDocs = useUnit(builderModel.$callDocs);
  const paramValues = useUnit(builderModel.$paramValues);
  const encodingError = useUnit(builderModel.$encodingError);
  const paramValueChanged = useUnit(builderModel.paramValueChanged);
  const selectedCall = useUnit(builderModel.$call);

  return (
    <Box direction="column" gap={3}>
      <PalletSelect />
      <div className="flex items-center gap-x-2">
        <div className="flex-1">
          <CallSelect />
        </div>
        {selectedCall && callDocs.length > 0 && (
          <Tooltip side="right">
            <Tooltip.Trigger>
              <div tabIndex={0}>
                <Icon name="info" className="cursor-pointer hover:text-icon-hover" size={16} />
              </div>
            </Tooltip.Trigger>
            <Tooltip.Content>{callDocs.join(' ')}</Tooltip.Content>
          </Tooltip>
        )}
      </div>

      {callArgDefs.length > 0 && (
        <Box direction="column" gap={2}>
          {callArgDefs.map((arg) => (
            <ParameterField
              key={arg.name}
              name={arg.name}
              typeDef={arg.typeDef}
              value={paramValues[arg.name]}
              depth={0}
              onChange={(value) => paramValueChanged({ name: arg.name, value })}
            />
          ))}
        </Box>
      )}

      {encodingError && (
        <FootnoteText className="text-text-negative">{t('extrinsicBuilder.encodingError')}</FootnoteText>
      )}
    </Box>
  );
});

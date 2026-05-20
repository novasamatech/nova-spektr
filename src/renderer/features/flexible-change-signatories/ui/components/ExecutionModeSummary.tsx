import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { DetailRow, FootnoteText } from '@/shared/ui';
import { changeSignatoriesModel } from '../../model/change-signatories-model';

import { ExecutionModeInfoPopover } from './ExecutionModeInfoPopover';

export const ExecutionModeSummary = () => {
  const { t } = useI18n();
  const mode = useUnit(changeSignatoriesModel.$executionMode);

  const isVerified = mode === 'verified';
  const titleKey = isVerified
    ? 'flexibleMultisig.editProxy.mode.verifiedTitle'
    : 'flexibleMultisig.editProxy.mode.trustedTitle';

  return (
    <DetailRow
      label={
        <span className="flex items-center gap-x-1.5">
          <FootnoteText as="span" className="text-text-tertiary">
            {t('flexibleMultisig.editProxy.mode.sectionTitle')}
          </FootnoteText>
          <ExecutionModeInfoPopover />
        </span>
      }
    >
      <div className="flex items-center gap-x-1.5">
        <span
          aria-hidden="true"
          className={cnTw('shrink-0 leading-none', isVerified ? 'text-icon-positive' : 'text-text-warning')}
        >
          {isVerified ? '✓' : '⚠'}
        </span>
        <span className="text-text-primary">{t(titleKey)}</span>
      </div>
    </DetailRow>
  );
};

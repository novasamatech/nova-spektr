import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { HelpText } from '@/shared/ui';
import { changeSignatoriesModel } from '../../model/change-signatories-model';
import { type ExecutionMode } from '../../types';

import { ExecutionModeInfoPopover } from './ExecutionModeInfoPopover';

const HINTS: Record<ExecutionMode, string> = {
  verified: 'flexibleMultisig.editProxy.mode.verifiedHint',
  trusted: 'flexibleMultisig.editProxy.mode.trustedHint',
};

export const ExecutionModeToggle = () => {
  const { t } = useI18n();
  const [mode, setMode] = useUnit([changeSignatoriesModel.$executionMode, changeSignatoriesModel.executionModeChanged]);

  return (
    <section className="flex flex-col items-start gap-y-1.5">
      <div className="flex items-center gap-x-2">
        <div
          role="tablist"
          aria-label={t('flexibleMultisig.editProxy.mode.sectionTitle')}
          className="inline-flex rounded-md border border-container-border bg-block-background-default p-0.5"
        >
          <PillButton
            active={mode === 'verified'}
            tone="positive"
            icon="✓"
            label={t('flexibleMultisig.editProxy.mode.verifiedShort')}
            onClick={() => setMode('verified')}
          />
          <PillButton
            active={mode === 'trusted'}
            tone="warning"
            icon="⚠"
            label={t('flexibleMultisig.editProxy.mode.trustedShort')}
            onClick={() => setMode('trusted')}
          />
        </div>
        <ExecutionModeInfoPopover />
      </div>
      <HelpText className="text-text-tertiary">{t(HINTS[mode])}</HelpText>
    </section>
  );
};

type PillButtonProps = {
  active: boolean;
  tone: 'positive' | 'warning';
  icon: string;
  label: string;
  onClick: () => void;
};

const PillButton = ({ active, tone, icon, label, onClick }: PillButtonProps) => (
  <button
    type="button"
    role="tab"
    aria-selected={active}
    className={cnTw(
      'flex items-center gap-x-1.5 rounded px-2.5 py-1 text-footnote font-medium transition-colors',
      active ? 'bg-main-app-background text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary',
    )}
    onClick={onClick}
  >
    <span
      aria-hidden="true"
      className={cnTw(
        active && tone === 'positive' && 'text-icon-positive',
        active && tone === 'warning' && 'text-text-warning',
      )}
    >
      {icon}
    </span>
    {label}
  </button>
);

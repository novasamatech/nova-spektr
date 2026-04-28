import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { changeSignatoriesModel } from '../../model/change-signatories-model';
import { type ExecutionMode } from '../../types';

export const ExecutionModeToggle = () => {
  const mode = useUnit(changeSignatoriesModel.$executionMode);

  return (
    <div className="grid grid-cols-2 gap-3">
      <ModeCard
        kind="verified"
        selected={mode === 'verified'}
        codeBlock={'proxy.addProxy(new)\n// removeProxy later'}
        titleKey="flexibleMultisig.editController.mode.verifiedTitle"
        bulletKeys={[
          'flexibleMultisig.editController.mode.verifiedBullet1',
          'flexibleMultisig.editController.mode.verifiedBullet2',
          'flexibleMultisig.editController.mode.verifiedBullet3',
        ]}
        onClick={() => changeSignatoriesModel.executionModeChanged('verified')}
      />
      <ModeCard
        kind="trusted"
        selected={mode === 'trusted'}
        codeBlock={'batchAll([\n  addProxy(new),\n  removeProxy(old),\n])'}
        titleKey="flexibleMultisig.editController.mode.trustedTitle"
        bulletKeys={[
          'flexibleMultisig.editController.mode.trustedBullet1',
          'flexibleMultisig.editController.mode.trustedBullet2',
          'flexibleMultisig.editController.mode.trustedBullet3',
        ]}
        onClick={() => changeSignatoriesModel.executionModeChanged('trusted')}
      />
    </div>
  );
};

type ModeCardProps = {
  kind: ExecutionMode;
  selected: boolean;
  onClick: () => void;
  codeBlock: string;
  titleKey: string;
  bulletKeys: string[];
};

const ModeCard = ({ kind, selected, onClick, codeBlock, titleKey, bulletKeys }: ModeCardProps) => {
  const { t } = useI18n();

  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cnTw(
        'flex w-full flex-col gap-y-3 rounded-lg p-3 text-left transition-colors',
        selected
          ? 'border-2 border-icon-accent bg-block-background-default'
          : 'border border-container-border bg-block-background-default hover:bg-action-background-hover',
      )}
      onClick={onClick}
    >
      <p className="text-footnote font-semibold text-text-primary">{t(titleKey)}</p>

      <pre className="rounded bg-main-app-background px-2 py-1.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-text-secondary">
        {codeBlock}
      </pre>

      <ul className="flex flex-col gap-y-1">
        {bulletKeys.map((key, index) => (
          <li
            key={key}
            className={cnTw(
              'flex items-start gap-x-1.5 text-help-text',
              kind === 'trusted' && index === 1 ? 'text-text-warning' : 'text-text-secondary',
            )}
          >
            <span className="mt-px shrink-0">{kind === 'verified' ? '✓' : '⚠'}</span>
            <span>{t(key)}</span>
          </li>
        ))}
      </ul>
    </button>
  );
};

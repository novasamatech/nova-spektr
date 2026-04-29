import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, Icon, SmallTitleText } from '@/shared/ui';
import { Popover } from '@/shared/ui-kit';
import { type ExecutionMode } from '../../types';

export const ExecutionModeInfoPopover = () => {
  const { t } = useI18n();

  return (
    <Popover enableHover side="bottom" align="start">
      <Popover.Trigger>
        <button
          type="button"
          aria-label={t('flexibleMultisig.editController.mode.sectionTitle')}
          className="flex h-5 w-5 items-center justify-center rounded text-icon-default hover:text-icon-hover"
        >
          <Icon name="questionOutline" size={16} />
        </button>
      </Popover.Trigger>
      <Popover.Content>
        <div className="flex w-[360px] flex-col gap-y-4 p-4">
          <SmallTitleText>{t('flexibleMultisig.editController.mode.sectionTitle')}</SmallTitleText>

          <ModeInfoBlock
            kind="verified"
            titleKey="flexibleMultisig.editController.mode.verifiedTitle"
            codeBlock={'proxy.addProxy(new)\n// removeProxy later'}
            bulletKeys={[
              'flexibleMultisig.editController.mode.verifiedBullet1',
              'flexibleMultisig.editController.mode.verifiedBullet2',
              'flexibleMultisig.editController.mode.verifiedBullet3',
            ]}
          />

          <ModeInfoBlock
            kind="trusted"
            titleKey="flexibleMultisig.editController.mode.trustedTitle"
            codeBlock={'batchAll([\n  addProxy(new),\n  removeProxy(old),\n])'}
            bulletKeys={[
              'flexibleMultisig.editController.mode.trustedBullet1',
              'flexibleMultisig.editController.mode.trustedBullet2',
              'flexibleMultisig.editController.mode.trustedBullet3',
            ]}
          />
        </div>
      </Popover.Content>
    </Popover>
  );
};

type ModeInfoBlockProps = {
  kind: ExecutionMode;
  titleKey: string;
  codeBlock: string;
  bulletKeys: string[];
};

const ModeInfoBlock = ({ kind, titleKey, codeBlock, bulletKeys }: ModeInfoBlockProps) => {
  const { t } = useI18n();

  return (
    <section className="flex flex-col gap-y-2">
      <FootnoteText className="font-semibold text-text-primary">{t(titleKey)}</FootnoteText>
      <pre
        aria-hidden="true"
        className="rounded bg-main-app-background px-2 py-1.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-text-secondary"
      >
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
            <span aria-hidden="true" className="mt-px shrink-0">
              {kind === 'verified' ? '✓' : '⚠'}
            </span>
            <span>{t(key)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

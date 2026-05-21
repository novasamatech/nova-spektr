import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { type AccountEntry, type SourceBreakdownKey, computeSourceBreakdown } from '@/aggregates/account-presets';

type BreakdownRow = {
  key: SourceBreakdownKey;
  colorClass: string;
  labelKey: string;
};

const BREAKDOWN_ROWS: BreakdownRow[] = [
  { key: 'wallet', colorClass: 'bg-icon-accent', labelKey: 'presets.counterTooltip.wallets' },
  { key: 'indexed', colorClass: 'bg-icon-warning', labelKey: 'presets.counterTooltip.indexed' },
  { key: 'localContact', colorClass: 'bg-icon-positive', labelKey: 'presets.counterTooltip.localContacts' },
  { key: 'backendContact', colorClass: 'bg-icon-alert', labelKey: 'presets.counterTooltip.backendContacts' },
];

type Tone = 'light' | 'dark';

type ToneClasses = {
  title: string;
  label: string;
  muted: string;
  track: string;
};

const TONE: Record<Tone, ToneClasses> = {
  light: {
    title: 'text-text-primary',
    label: 'text-text-secondary',
    muted: 'text-text-tertiary',
    track: 'bg-block-background-default',
  },
  dark: {
    title: 'text-white',
    label: 'text-white',
    muted: 'text-white/60',
    track: 'bg-white/10',
  },
};

type Props = {
  entries: AccountEntry[];
  total: number;
  tone?: Tone;
};

export const SourceBreakdownBar = ({ entries, total, tone = 'light' }: Props) => {
  const { t } = useI18n();

  const count = entries.length;
  const breakdown = computeSourceBreakdown(entries);
  const segments = BREAKDOWN_ROWS.filter((row) => breakdown[row.key] > 0);
  const barTotal = segments.reduce((sum, row) => sum + breakdown[row.key], 0);
  const overlap = barTotal > count ? barTotal - count : 0;
  const toneClasses = TONE[tone];

  return (
    <div className="flex flex-col gap-y-2">
      <FootnoteText className={cnTw('font-semibold', toneClasses.title)}>
        {t('presets.counterTooltip.title', { count, total })}
      </FootnoteText>
      {count === 0 ? (
        <FootnoteText className={toneClasses.label}>{t('presets.counterTooltip.empty')}</FootnoteText>
      ) : (
        <>
          <div className={cnTw('flex h-1.5 w-full overflow-hidden rounded-full', toneClasses.track)}>
            {segments.map((row) => (
              <div
                key={row.key}
                className={cnTw('h-full', row.colorClass)}
                style={{ width: `${(breakdown[row.key] / barTotal) * 100}%` }}
              />
            ))}
          </div>
          <ul className="flex flex-col gap-y-1">
            {segments.map((row) => (
              <li key={row.key} className="flex items-center gap-x-2">
                <span className={cnTw('size-2 rounded-full', row.colorClass)} />
                <FootnoteText className={toneClasses.label}>
                  {t(row.labelKey, { count: breakdown[row.key] })}
                </FootnoteText>
              </li>
            ))}
          </ul>
          {overlap > 0 && (
            <FootnoteText className={toneClasses.muted}>
              {t('presets.counterTooltip.overlap', { count: overlap })}
            </FootnoteText>
          )}
        </>
      )}
    </div>
  );
};

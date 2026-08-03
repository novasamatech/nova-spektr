import { type ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { DashboardWidget } from '@/pages/Dashboard';

import { KpiCard } from './KpiCard';

export const EM_DASH = '—';

/**
 * One KPI card as a dashboard widget: a quarter of the grid, no card chrome of
 * its own — `KpiCard` brings its own border and shadow.
 *
 * Each card is a separate widget so the user can put it where they want; the
 * frame is what keeps the four looking like one row when they happen to sit
 * next to each other.
 */
export const KpiWidgetFrame = ({ children }: { children: ReactNode }) => (
  <DashboardWidget colSpan={1} card={false}>
    {children}
  </DashboardWidget>
);

/**
 * Nothing is selected, so there is nothing to drill into.
 *
 * A quarter-width card has no room for the two-line "select accounts above"
 * block the full-width widgets use, and zeroes would be a lie — the card keeps
 * its shape and says the figure is unknown.
 */
export const NoSelectionCard = ({ title }: { title: string }) => {
  const { t } = useI18n();

  return (
    <KpiWidgetFrame>
      <KpiCard
        title={title}
        ariaLabel={title}
        valueClass="text-text-tertiary"
        value={EM_DASH}
        subline={t('dashboard.noSelection.title')}
      />
    </KpiWidgetFrame>
  );
};

import { type ReactNode } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { type AccountEntry, type AccountSource } from '@/aggregates/account-presets';

const SOURCE_LABELS: Record<AccountSource, string> = {
  wallet: 'wallet',
  'local-contact': 'contact',
  'backend-contact': 'external',
};

const SOURCE_BADGE_COLORS: Record<AccountSource, string> = {
  wallet: 'bg-icon-accent/10 text-icon-accent',
  'local-contact': 'bg-icon-positive/10 text-icon-positive',
  'backend-contact': 'bg-icon-alert/10 text-icon-alert',
};

const SOURCE_BADGE_ORDER: AccountSource[] = ['wallet', 'local-contact', 'backend-contact'];

const ENTITY_BADGE = 'bg-badge-orange-background-default text-badge-orange-text';

const Badge = ({ className, children }: { className?: string; children: ReactNode }) => (
  <span className={cnTw('rounded-full px-2 py-0.5 text-[10px] font-medium', className)}>{children}</span>
);

export const AccountEntryRowBadges = ({ entry }: { entry: AccountEntry }) => {
  const entityName = entry.sources.includes('backend-contact') ? entry.entityNames?.[0] : undefined;

  return (
    <div className="flex shrink-0 items-center gap-x-1">
      {entityName && <Badge className={ENTITY_BADGE}>{entityName}</Badge>}
      {SOURCE_BADGE_ORDER.filter((s) => entry.sources.includes(s)).map((source) => (
        <Badge key={source} className={SOURCE_BADGE_COLORS[source]}>
          {SOURCE_LABELS[source]}
        </Badge>
      ))}
    </div>
  );
};

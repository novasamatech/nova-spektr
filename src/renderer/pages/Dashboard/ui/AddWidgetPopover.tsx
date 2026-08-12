import { useUnit } from 'effector-react';
import { useState } from 'react';

import { type SlotIdentifier, type SlotProps } from '@/shared/di/createSlot';
import { useI18n } from '@/shared/i18n';
import { IconButton } from '@/shared/ui';
import { Popover } from '@/shared/ui-kit';
import { dashboardModel } from '../model/dashboard-model';

import { type WidgetGridMeta } from './Dashboard';

type Props<P extends SlotProps> = {
  slot: SlotIdentifier<P, WidgetGridMeta>;
  tab: string;
};

export const AddWidgetPopover = <P extends SlotProps>({ slot, tab }: Props<P>) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const handlers = useUnit(slot.$handlers);
  const hiddenWidgets = useUnit(dashboardModel.$hiddenWidgets);
  const widgetRestored = useUnit(dashboardModel.widgetRestored);

  const hidden = new Set(hiddenWidgets[tab] ?? []);
  const hiddenHandlers = handlers
    .filter((h) => {
      try {
        return h.key != null && hidden.has(h.key) && h.available();
      } catch {
        return false;
      }
    })
    .sort((a, b) => (a.body.order ?? 0) - (b.body.order ?? 0));

  const hasHiddenWidgets = hiddenHandlers.length > 0;

  return (
    <Popover open={open && hasHiddenWidgets} align="end" onToggle={setOpen}>
      <Popover.Trigger>
        <IconButton name="add" disabled={!hasHiddenWidgets} ariaLabel={t('dashboard.addWidget')} />
      </Popover.Trigger>
      <Popover.Content>
        <ul className="flex max-h-60 w-56 flex-col gap-y-0.5 overflow-y-auto p-2">
          {hiddenHandlers.map((h) => (
            <li key={h.key}>
              <button
                type="button"
                className="w-full rounded px-2 py-1.5 text-left text-footnote hover:bg-hover focus:bg-hover"
                onClick={() => {
                  if (h.key == null) return;
                  widgetRestored({ tab, key: h.key });
                  setOpen(false);
                }}
              >
                {h.body.label ? t(h.body.label) : h.key}
              </button>
            </li>
          ))}
        </ul>
      </Popover.Content>
    </Popover>
  );
};

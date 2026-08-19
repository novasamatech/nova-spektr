import { useUnit } from 'effector-react';
import { useState } from 'react';

import { type SlotIdentifier, type SlotProps } from '@/shared/di/createSlot';
import { useI18n } from '@/shared/i18n';
import { IconButton } from '@/shared/ui';
import { Dropdown } from '@/shared/ui-kit';
import { partitionWidgets } from '../lib/widget-visibility';
import { dashboardModel } from '../model/dashboard-model';

import { type WidgetGridMeta } from './Dashboard';

type Props<P extends SlotProps> = {
  slot: SlotIdentifier<P, WidgetGridMeta>;
  tab: string;
};

export const AddWidgetMenu = <P extends SlotProps>({ slot, tab }: Props<P>) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const handlers = useUnit(slot.$handlers);
  const hiddenWidgets = useUnit(dashboardModel.$hiddenWidgets);
  const widgetRestored = useUnit(dashboardModel.widgetRestored);

  const { hidden } = partitionWidgets(handlers, hiddenWidgets[tab] ?? []);
  const hasHiddenWidgets = hidden.length > 0;

  // The hidden set syncs across windows, so the list can empty out under an
  // open menu. Dropping `open` with it keeps the menu from re-appearing on its
  // own the next time the user hides something.
  if (open && !hasHiddenWidgets) {
    setOpen(false);
  }

  return (
    <Dropdown open={open && hasHiddenWidgets} align="end" onToggle={setOpen}>
      <Dropdown.Trigger disabled={!hasHiddenWidgets}>
        <IconButton name="add" disabled={!hasHiddenWidgets} ariaLabel={t('dashboard.addWidget')} />
      </Dropdown.Trigger>
      <Dropdown.Content>
        {hidden.map((handler) => (
          <Dropdown.Item key={handler.key} onSelect={() => widgetRestored({ tab, key: handler.key })}>
            {handler.body.label ? t(handler.body.label) : handler.key}
          </Dropdown.Item>
        ))}
      </Dropdown.Content>
    </Dropdown>
  );
};

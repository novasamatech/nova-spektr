import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Tabs } from '@/shared/ui-kit';
import { contactSourceModel } from '../model/contact-source-model';

type Props = {
  localCount: number;
  backendCount: number;
};

export const SourceTabs = ({ localCount, backendCount }: Props) => {
  const { t } = useI18n();

  const [sourceTab, availableSources] = useUnit([contactSourceModel.$sourceTab, contactSourceModel.$availableSources]);
  const sourceTabChanged = useUnit(contactSourceModel.events.sourceTabChanged);

  if (availableSources.length === 0) {
    return null;
  }

  return (
    <div className="min-w-[320px] [&_[role=tablist]]:mb-0">
      <Tabs value={sourceTab} onChange={sourceTabChanged}>
        <Tabs.List>
          {availableSources.map((source) => {
            const count = source.id === 'local' ? localCount : backendCount;
            const label = source.id === 'local' ? t('addressBook.sources.myContacts') : source.label;

            return (
              <Tabs.Trigger key={source.id} value={source.id}>
                <span className="whitespace-nowrap">{label}</span>
                {count > 0 && <span className="text-text-tertiary">{count}</span>}
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>
      </Tabs>
    </div>
  );
};

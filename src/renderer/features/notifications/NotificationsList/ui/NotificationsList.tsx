import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { useDeferredList } from '@/shared/lib/hooks';
import { BodyText, FootnoteText, SmallTitleText } from '@/shared/ui';
import { Accordion, AsyncItem, Graphics } from '@/shared/ui-kit';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { notificationListModel } from '../model/notification-list-model';

import { NotificationRow } from './NotificationRow';

export const NotificationsList = () => {
  const { t } = useI18n();
  const notificationGroups = useUnit(notificationListModel.$notificationGroups);
  const isSearchEmpty = useUnit(notificationListModel.$isSearchEmpty);
  const chains = useUnit(networkModel.$chains);
  const wallets = useUnit(walletModel.$wallets);
  const { list: deferredGroups } = useDeferredList({ list: notificationGroups, forceFirstRender: true });

  if (isSearchEmpty) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-y-4">
        <Graphics name="emptyList" size={178} />
        <div className="flex flex-col items-center gap-y-2">
          <SmallTitleText>{t('notifications.emptySearchTitle')}</SmallTitleText>
          <BodyText className="text-text-tertiary">{t('notifications.emptySearchDescription')}</BodyText>
        </div>
      </div>
    );
  }

  if (deferredGroups.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 flex h-full w-full flex-1 flex-col items-center overflow-y-auto pl-6">
      {deferredGroups.map(([date, notifications], index) => {
        const strategy = index === 0 ? ('sync' as const) : ('idle' as const);

        return (
          <AsyncItem strategy={strategy} key={date}>
            <section className="flex w-[736px] flex-col">
              <Accordion initialOpen>
                <Accordion.Trigger>
                  <FootnoteText className="text-text-tertiary">{date}</FootnoteText>
                </Accordion.Trigger>
                <Accordion.Content>
                  <ul className="mt-1 flex flex-col gap-y-1.5">
                    {notifications.slice(0, 3).map((notification) => (
                      <NotificationRow
                        key={notification.id}
                        notification={notification}
                        chains={chains}
                        wallets={wallets}
                      />
                    ))}
                  </ul>
                </Accordion.Content>
              </Accordion>
            </section>
          </AsyncItem>
        );
      })}
    </div>
  );
};

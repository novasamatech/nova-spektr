import { format } from 'date-fns';
import { useUnit } from 'effector-react';
import { type TFunction } from 'i18next';
import { type PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { useI18n } from '@/shared/i18n';
import { useDeferredList } from '@/shared/lib/hooks/useDeferredList';
import { entries, nonNullable, toRomanNumeral } from '@/shared/lib/utils';
import { Duration, FootnoteText, HelpText, Icon, Separator, SmallTitleText } from '@/shared/ui';
import { Box, Modal, Select } from '@/shared/ui-kit';
import { type FeedRecord, evidenceService } from '@/domains/collectives';
import { activity } from '../model/activity';
import { alertsModel } from '../model/alerts';

import { ReferendumActivityItem } from './ReferendumActivityItem';

const FILTER_TYPES_TITLES = {
  promotion: 'fellowship.profile.activityFeed.filterPromotion',
  retention: 'fellowship.profile.activityFeed.filterRetention',
  status: 'fellowship.profile.activityFeed.filterStatus',
  salary: 'fellowship.profile.activityFeed.filterSalary',
  referendum: 'fellowship.profile.activityFeed.filterReferendum',
} as const;

type FilterType = keyof typeof FILTER_TYPES_TITLES;

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

const SUBSCAN_COLLECTIVES_URL = 'https://collectives-polkadot.subscan.io';

const getMessage = (t: TFunction, record: FeedRecord) => {
  if (record.type === 'activeChanged') {
    return t('fellowship.profile.activityFeed.status', {
      status: record.isActive
        ? t('fellowship.profile.activityFeed.statusActive')
        : t('fellowship.profile.activityFeed.statusInactive'),
    });
  }

  if (record.type === 'imported') {
    return t('fellowship.profile.activityFeed.imported', { rank: toRomanNumeral(record.rank) });
  }

  if (record.type === 'promoted') {
    return t('fellowship.profile.activityFeed.promoted', { rank: toRomanNumeral(record.rank) });
  }

  if (record.type === 'demoted') {
    return t('fellowship.profile.activityFeed.demoted', { rank: toRomanNumeral(record.rank) });
  }

  if (record.type === 'proven') {
    return t('fellowship.profile.activityFeed.proven', { rank: toRomanNumeral(record.rank) });
  }

  if (record.type === 'paid') {
    return t('fellowship.profile.activityFeed.paid');
  }

  if (record.type === 'requested') {
    return record.wish == 'Promotion'
      ? t('fellowship.profile.activityFeed.requestedPromotion')
      : t('fellowship.profile.activityFeed.requestedRetention');
  }

  if (record.type === 'referendum') {
    return t('fellowship.profile.activityFeed.referendum');
  }

  return '';
};

const getLink = (t: TFunction, record: FeedRecord): { text: string; url: string } | null => {
  if (
    record.type === 'imported' ||
    record.type === 'promoted' ||
    record.type === 'demoted' ||
    record.type === 'proven'
  ) {
    return {
      text: t('fellowship.profile.activityFeed.viewExtrinsic'),
      url: `${SUBSCAN_COLLECTIVES_URL}/block/${record.block}`,
    };
  }

  if (record.type === 'requested') {
    return {
      text: t('fellowship.profile.activityFeed.viewEvidence'),
      url: evidenceService.getEvidenceIpfsUrl(record.hash).toString(),
    };
  }

  return null;
};

export const ActivityFeed = ({ children }: PropsWithChildren) => {
  const { t } = useI18n();
  const list = useUnit(activity.$list);
  const [filter, setFilter] = useState<FilterType | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const now = useRef(Date.now());

  useEffect(() => {
    if (isOpen) {
      alertsModel.markAllAsSeen();
    }
  }, [isOpen]);

  const filteredList = useMemo(() => {
    if (filter === null) return list;

    return list.filter(record => {
      switch (filter) {
        case 'promotion':
          return record.type === 'promoted' || (record.type === 'requested' && record.wish === 'Promotion');
        case 'retention':
          return record.type === 'proven' || (record.type === 'requested' && record.wish === 'Retention');
        case 'status':
          return record.type === 'activeChanged';
        case 'salary':
          return record.type === 'paid';
        case 'referendum':
          return record.type === 'referendum';
        default:
          return true;
      }
    });
  }, [list, filter]);

  const { list: deferredList } = useDeferredList({ list: filteredList });

  const handleClearFilter = () => {
    setFilter(null);
  };

  return (
    <Modal size="md" height="lg" isOpen={isOpen} onToggle={setIsOpen}>
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>{t('fellowship.profile.history')}</Modal.Title>
      <Modal.Content>
        <Box padding={[0, 3, 0]} gap={0} height="100%">
          <div className="flex w-full items-center gap-2 px-2 pb-4">
            <div className="grow">
              <Select placeholder={t('fellowship.profile.activityFeed.filterAll')} value={filter} onChange={setFilter}>
                {entries(FILTER_TYPES_TITLES).map(([key, title]) => (
                  <Select.Item key={key} value={key}>
                    {t(title)}
                  </Select.Item>
                ))}
              </Select>
            </div>
            {nonNullable(filter) && (
              <button
                className="shrink-0 cursor-pointer text-footnote font-semibold text-primary-button-background-default"
                onClick={handleClearFilter}
              >
                {t('fellowship.profile.activityFeed.clear')}
              </button>
            )}
          </div>
          {deferredList.length === 0 ? (
            <div className="flex grow flex-col items-center justify-center gap-3">
              <Icon name="document" size={64} />
              <Box gap={2} horizontalAlign="center">
                <SmallTitleText className="text-center">
                  {t('fellowship.profile.activityFeed.noEventsTitle')}
                </SmallTitleText>
                <FootnoteText className="text-center text-text-tertiary">
                  {t('fellowship.profile.activityFeed.noEventsDesc')}
                </FootnoteText>
              </Box>
            </div>
          ) : (
            <Box padding={[0, 2, 5]} gap={3}>
              {deferredList.map(x => {
                const age = now.current - x.at.getTime();
                const isOlderThanMonth = age > ONE_MONTH_MS;
                const link = getLink(t, x);
                const isShowIconLink =
                  x.type === 'imported' || x.type === 'promoted' || x.type === 'demoted' || x.type === 'proven';

                return (
                  <div key={`${x.type}-${x.block}`} className="flex flex-col gap-3">
                    <div className="flex justify-between gap-2">
                      {x.type === 'referendum' ? (
                        <ReferendumActivityItem record={x} />
                      ) : (
                        <div className="flex flex-col gap-1">
                          <FootnoteText className="grow font-bold">{getMessage(t, x)}</FootnoteText>
                          {link && (
                            <Link
                              className="flex items-center gap-1 font-semibold text-primary-button-background-default"
                              to={link.url}
                              target="_blank"
                            >
                              {link.text}
                              {isShowIconLink && <Icon name="link" size={16} className="text-icon-accent" />}
                            </Link>
                          )}
                        </div>
                      )}

                      <HelpText className="mb-auto shrink-0 pt-[2px] text-text-secondary">
                        {isOlderThanMonth ? format(x.at, 'dd/MM/yyyy') : <Duration seconds={age / 1000} />}
                      </HelpText>
                    </div>
                    <Separator />
                  </div>
                );
              })}
            </Box>
          )}
        </Box>
      </Modal.Content>
    </Modal>
  );
};

import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { Accordion, CaptionText, Shimmering } from '@shared/ui';
import { referendumListModel } from '../model/referendum-list-model';

export const LoadingOngoing = () => {
  const { t } = useI18n();

  const isLoading = useUnit(referendumListModel.$isLoading);

  if (!isLoading) return null;

  return (
    <Accordion isDefaultOpen>
      <Accordion.Button buttonClass="py-1.5 px-2 mb-2">
        <div className="flex items-center gap-x-2 w-full">
          <CaptionText className="uppercase text-text-secondary tracking-[0.75px] font-semibold">
            {t('governance.referendums.ongoing')}
          </CaptionText>
          <Shimmering width={25} height={12} />
        </div>
      </Accordion.Button>
      <Accordion.Content as="ul" className="flex flex-col gap-y-2">
        {Array.from({ length: 4 }, (_, index) => (
          <li key={index}>
            <div className="flex flex-col gap-y-3 p-3 w-full rounded-md bg-white">
              <div className="flex justify-between gap-x-2">
                <Shimmering width={240} height={20} />
                <Shimmering width={125} height={20} />
              </div>
              <div className="flex justify-between gap-x-6 w-full">
                <Shimmering className="rounded-lg" width={332} height={62} />
                <div className="w-[1px] h-[62px] bg-divider" />
                <Shimmering className="rounded-lg" width={332} height={62} />
              </div>
            </div>
          </li>
        ))}
      </Accordion.Content>
    </Accordion>
  );
};
import { useI18n } from '@app/providers';
import { Voted } from '@entities/governance';
import { FootnoteText, Accordion, CaptionText, OperationStatus, HeadlineText } from '@shared/ui';
import { ReferendumId, CompletedReferendum, ReferendumType } from '@shared/core';

const Status: Record<
  Exclude<ReferendumType, ReferendumType.Ongoing>,
  { text: string; pallet: 'default' | 'success' | 'error' }
> = {
  [ReferendumType.Approved]: { text: 'Executed', pallet: 'success' },
  [ReferendumType.Rejected]: { text: 'Rejected', pallet: 'error' },
  [ReferendumType.Cancelled]: { text: 'Cancelled', pallet: 'default' },
  [ReferendumType.Killed]: { text: 'Killed', pallet: 'error' },
  [ReferendumType.TimedOut]: { text: 'Timed out', pallet: 'default' },
};

type Props = {
  referendums: Map<ReferendumId, CompletedReferendum>;
  details: Record<ReferendumId, string>;
  onSelected: (index: ReferendumId) => void;
};

export const CompletedReferendums = ({ referendums, details, onSelected }: Props) => {
  const { t } = useI18n();

  if (referendums.size === 0) return null;

  return (
    <Accordion isDefaultOpen>
      <Accordion.Button buttonClass="py-1.5 px-2 mb-2">
        <div className="flex items-center gap-x-2 w-full">
          <CaptionText className="uppercase text-text-secondary tracking-[0.75px] font-semibold">
            {t('governance.referendums.completed')}
          </CaptionText>
          <CaptionText className="text-text-tertiary font-semibold">{Object.keys(referendums).length}</CaptionText>
        </div>
      </Accordion.Button>
      <Accordion.Content as="ul" className="flex flex-col gap-y-2">
        {Array.from(referendums).map(([index, referendum]) => (
          <li key={index}>
            <button
              type="button"
              className="flex flex-col gap-y-3 p-3 w-full rounded-md bg-white"
              onClick={() => onSelected(index)}
            >
              <div className="flex items-center gap-x-2 w-full">
                <Voted />
                <OperationStatus pallet={Status[referendum.type].pallet}>
                  {t(Status[referendum.type].text)}
                </OperationStatus>
                <FootnoteText className="ml-auto text-text-secondary">#{index}</FootnoteText>
              </div>
              <HeadlineText>{details[index] || `Referendum #${index}`}</HeadlineText>
            </button>
          </li>
        ))}
      </Accordion.Content>
    </Accordion>
  );
};

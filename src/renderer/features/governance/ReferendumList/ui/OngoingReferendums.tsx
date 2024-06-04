import { useI18n } from '@app/providers';
import { Voted, ReferendumTimer, VoteChartSm } from '@entities/governance';
import { FootnoteText, Accordion, CaptionText, OperationStatus, HeadlineText, Icon } from '@shared/ui';
import type { ReferendumId, OngoingReferendum } from '@shared/core';

type Props = {
  referendums: Map<ReferendumId, OngoingReferendum>;
  details: Record<ReferendumId, string>;
  onSelected: (index: ReferendumId) => void;
};

export const OngoingReferendums = ({ referendums, details, onSelected }: Props) => {
  const { t } = useI18n();

  if (referendums.size === 0) return null;

  return (
    <Accordion isDefaultOpen>
      <Accordion.Button buttonClass="py-1.5 px-2 mb-2">
        <div className="flex items-center gap-x-2 w-full">
          <CaptionText className="uppercase text-text-secondary tracking-[0.75px] font-semibold">
            {t('governance.referendums.ongoing')}
          </CaptionText>
          <CaptionText className="text-text-tertiary font-semibold">{referendums.size}</CaptionText>
        </div>
      </Accordion.Button>
      <Accordion.Content as="ul" className="flex flex-col gap-y-2">
        {Array.from(referendums).map(([index, referendum]) => {
          const total = referendum.tally.ayes.add(referendum.tally.nays);

          return (
            <li key={index}>
              <button
                className="flex flex-col gap-y-3 p-3 w-full rounded-md bg-white"
                onClick={() => onSelected(index)}
              >
                <div className="flex items-center gap-x-2 w-full">
                  <Voted />
                  <OperationStatus pallet="success">Approve</OperationStatus>
                  <ReferendumTimer status="reject" time={600000} />
                  <div className="flex ml-auto text-text-secondary">
                    <FootnoteText className="text-inherit">#{index}</FootnoteText>
                    <Icon name="network" size={16} className="text-inherit ml-2 mr-1" />
                    <FootnoteText className="text-inherit">Treasury: medium spend</FootnoteText>
                  </div>
                </div>
                <div className="flex items-start gap-x-6 w-full">
                  <HeadlineText className="flex-1 pointer-events-auto">
                    {details[index] || `Referendum #${index}`}
                  </HeadlineText>
                  <div className="basis-[200px] shrink-0">
                    <VoteChartSm
                      aye={referendum.tally.ayes.muln(100).div(total).toNumber()}
                      nay={referendum.tally.nays.muln(100).div(total).toNumber()}
                      pass={25}
                    />
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </Accordion.Content>
    </Accordion>
  );
};

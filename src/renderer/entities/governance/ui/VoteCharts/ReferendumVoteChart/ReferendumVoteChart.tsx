import { useI18n } from '@/app/providers';
import { Tooltip } from '@/shared/ui/Popovers';
import { FootnoteText, HelpText } from '@/shared/ui/Typography';
import { VoteChart } from '@shared/ui-entries';

type Props = {
  aye: number;
  nay: number;
  pass: number;
  bgColor?: string;
  descriptionPosition?: 'tooltip' | 'bottom';
};

export const ReferendumVoteChart = ({
  aye,
  nay,
  pass,
  descriptionPosition = 'tooltip',
  bgColor = 'icon-button',
}: Props) => {
  const { t } = useI18n();

  const chartNode = (
    <VoteChart value={aye} disabled={aye === 0 && nay === 0} threshold={pass} thresholdIndicatorBorder={bgColor} />
  );

  if (descriptionPosition === 'tooltip') {
    return (
      <Tooltip
        offsetPx={-78}
        wrapperClass="w-full"
        content={
          <div className="flex flex-col">
            <HelpText className="text-inherit">{`${t('voteChart.toPass')} ${pass.toFixed(2)}%`}</HelpText>
            <HelpText className="text-inherit">{`${t('voteChart.aye')} ${aye.toFixed(2)}%`}</HelpText>
            <HelpText className="text-inherit">{`${t('voteChart.nay')} ${nay.toFixed(2)}%`}</HelpText>
          </div>
        }
      >
        {chartNode}
      </Tooltip>
    );
  }

  if (descriptionPosition === 'bottom') {
    return (
      <div className="flex w-full flex-col gap-1">
        {chartNode}
        <div className="flex justify-between">
          <div className="flex flex-col items-start">
            <FootnoteText>{aye.toFixed(2)}%</FootnoteText>
            <FootnoteText className="text-text-secondary">{t('voteChart.aye')}</FootnoteText>
          </div>
          <div className="flex flex-col items-center">
            <FootnoteText>{pass.toFixed(2)}%</FootnoteText>
            <FootnoteText className="text-text-secondary">{t('voteChart.toPass')}</FootnoteText>
          </div>
          <div className="flex flex-col items-end">
            <FootnoteText>{nay.toFixed(2)}%</FootnoteText>
            <FootnoteText className="text-text-secondary">{t('voteChart.nay')}</FootnoteText>
          </div>
        </div>
      </div>
    );
  }

  return chartNode;
};

import { useI18n } from '@/app/providers';
import { Tooltip } from '@/shared/ui/Popovers';
import { FootnoteText, HelpText } from '@/shared/ui/Typography';
import '../common/styles.css';

type Props = {
  aye: number;
  nay: number;
  pass: number;
  bgColor?: string;
  descriptionPosition?: 'tooltip' | 'bottom';
};

export const VoteChart = ({
  aye,
  nay,
  pass,
  descriptionPosition = 'tooltip',
  bgColor = 'background-default',
}: Props) => {
  const { t } = useI18n();

  const chartNode = (
    <div className="vote-chart-container">
      <div className="vote-chart-aye" style={{ width: `clamp(4px, calc(${aye}% - 2px), calc(100% - 8px))` }} />
      <div className="vote-chart-nay" style={{ width: `clamp(4px, calc(${nay}% - 2px), calc(100% - 8px))` }} />
      <div
        className="vote-chart-point"
        style={{ backgroundColor: `var(--${bgColor})`, left: `clamp(3px, ${pass}%, calc(100% - 3px))` }}
      />
    </div>
  );

  if (descriptionPosition === 'tooltip') {
    return (
      <Tooltip
        offsetPx={-78}
        wrapperClass="w-full"
        content={
          <div className="flex flex-col">
            <HelpText className="text-text-white">{`${t('voteChart.toPass')} ${pass.toFixed(2)}%`}</HelpText>
            <HelpText className="text-text-white">{`${t('voteChart.aye')} ${aye.toFixed(2)}%`}</HelpText>
            <HelpText className="text-text-white">{`${t('voteChart.nay')} ${nay.toFixed(2)}%`}</HelpText>
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
            <FootnoteText>${aye.toFixed(2)}%</FootnoteText>
            <FootnoteText className="text-text-secondary">{t('voteChart.aye')}</FootnoteText>
          </div>
          <div className="flex flex-col items-center">
            <FootnoteText>${pass.toFixed(2)}%</FootnoteText>
            <FootnoteText className="text-text-secondary">{t('voteChart.toPass')}</FootnoteText>
          </div>
          <div className="flex flex-col items-end">
            <FootnoteText>${nay.toFixed(2)}%</FootnoteText>
            <FootnoteText className="text-text-secondary">{t('voteChart.nay')}</FootnoteText>
          </div>
        </div>
      </div>
    );
  }

  return chartNode;
};

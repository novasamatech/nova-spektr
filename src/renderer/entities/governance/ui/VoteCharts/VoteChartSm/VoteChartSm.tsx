import { useI18n } from '@app/providers';
import { Tooltip } from '@shared/ui/Popovers';
import { HelpText } from '@shared/ui/Typography';
import '../common/styles.css';

type Props = {
  aye: number;
  nay: number;
  pass: number;
  bgColor?: string;
};

export const VoteChartSm = ({ aye, nay, pass, bgColor = 'background-default' }: Props) => {
  const { t } = useI18n();

  return (
    <Tooltip
      offsetPx={-56}
      content={
        <div className="flex flex-col">
          <HelpText className="text-text-white">{`${t('voteChart.toPass')} ${pass.toFixed(2)}%`}</HelpText>
          <HelpText className="text-text-white">{`${t('voteChart.aye')} ${aye.toFixed(2)}%`}</HelpText>
          <HelpText className="text-text-white ">{`${t('voteChart.nay')} ${nay.toFixed(2)}%`}</HelpText>
        </div>
      }
    >
      <div className="vote-chart-container absolute">
        <div className="vote-chart-aye" style={{ width: `clamp(4px, calc(${aye}% - 2px), calc(100% - 8px))` }} />
        <div className="vote-chart-nay" style={{ width: `clamp(4px, calc(${nay}% - 2px), calc(100% - 8px))` }} />
        <div
          className="vote-chart-point"
          style={{ backgroundColor: `var(--${bgColor})`, left: `clamp(3px, ${pass}%, calc(100% - 3px))` }}
        />
      </div>
    </Tooltip>
  );
};

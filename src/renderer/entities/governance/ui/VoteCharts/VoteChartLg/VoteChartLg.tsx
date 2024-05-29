import { useI18n } from '@app/providers';
import { FootnoteText } from '@shared/ui/Typography';
import '../common/styles.css';

type Props = {
  aye: number;
  nay: number;
  pass: number;
  bgColor?: string;
};

export const VoteChartLg = ({ aye, nay, pass, bgColor = 'background-default' }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-y-1">
      <div className="vote-chart-container relative">
        <div className="vote-chart-aye" style={{ width: `clamp(4px, calc(${aye}% - 2px), calc(100% - 8px))` }} />
        <div className="vote-chart-nay" style={{ width: `clamp(4px, calc(${nay}% - 2px), calc(100% - 8px))` }} />
        <div
          className="vote-chart-point"
          style={{ backgroundColor: `var(--${bgColor})`, left: `clamp(3px, ${pass}%, calc(100% - 3px))` }}
        />
      </div>
      <div className="grid grid-flow-col grid-rows-2">
        <FootnoteText>{aye.toFixed(2)}%</FootnoteText>
        <FootnoteText className="text-text-secondary">{t('voteChart.aye')}</FootnoteText>
        <FootnoteText className="justify-self-center">{pass.toFixed(2)}%</FootnoteText>
        <FootnoteText className="text-text-secondary justify-self-center">{t('voteChart.toPass')}</FootnoteText>
        <FootnoteText className="justify-self-end">{nay.toFixed(2)}%</FootnoteText>
        <FootnoteText className="text-text-secondary justify-self-end">{t('voteChart.nay')}</FootnoteText>
      </div>
    </div>
  );
};

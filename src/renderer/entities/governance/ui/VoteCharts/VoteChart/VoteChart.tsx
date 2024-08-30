import { useI18n } from '@/app/providers';
import { Tooltip } from '@/shared/ui/Popovers';
import { FootnoteText, HelpText } from '@/shared/ui/Typography';
import { cnTw } from '@shared/lib/utils';

type Props = {
  aye: number;
  nay: number;
  pass: number;
  bgColor?: string;
  descriptionPosition?: 'tooltip' | 'bottom';
};

const calcWidth = (value: number) => `clamp(4px, calc(${value}% - 2px), calc(100% - 8px))`;

export const VoteChart = ({ aye, nay, pass, descriptionPosition = 'tooltip', bgColor = 'icon-button' }: Props) => {
  const { t } = useI18n();

  const inactive = aye === 0 && nay === 0;

  const chartNode = (
    <div className="relative flex h-5.5 w-full items-center justify-between gap-x-1">
      {inactive && <div className="h-2.5 w-full rounded-md bg-tab-icon-inactive" />}
      {!inactive && (
        <>
          <div className="h-2.5 rounded-md bg-icon-positive" style={{ width: calcWidth(aye) }} />
          <div className="h-2.5 rounded-md bg-icon-negative" style={{ width: calcWidth(nay) }} />
        </>
      )}
      <div
        className={cnTw(
          'absolute flex h-4 w-1.5 translate-x-[-50%] justify-center bg-border-dark',
          'after:contest-[""] after:block after:h-full after:w-0.5 after:rounded-sm after:bg-border-dark',
        )}
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

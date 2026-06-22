import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { FootnoteText, Icon, SmallTitleText } from '@/shared/ui';
import { Popover } from '@/shared/ui-kit';
import { verifyProxyModel } from '../model/verify-proxy-model';

export const RemarkInfoPopover = () => {
  const { t } = useI18n();

  const remarkPayload = useUnit(verifyProxyModel.$remarkPayload);

  if (!remarkPayload) {
    return null;
  }

  return (
    <Popover enableHover side="bottom" align="end">
      <Popover.Trigger>
        <button
          type="button"
          aria-label={t('walletDetails.proxies.verifyRemarkInfoTitle')}
          className="flex h-5 w-5 items-center justify-center rounded text-icon-default hover:text-icon-hover"
        >
          <Icon name="questionOutline" size={16} />
        </button>
      </Popover.Trigger>
      <Popover.Content>
        <div className="flex w-[360px] flex-col gap-y-2 p-4">
          <SmallTitleText>{t('walletDetails.proxies.verifyRemarkInfoTitle')}</SmallTitleText>
          <FootnoteText className="text-text-secondary">
            {t('walletDetails.proxies.verifyRemarkInfoDescription')}
          </FootnoteText>
          <pre className="rounded bg-main-app-background px-2 py-1.5 font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap text-text-secondary">
            {JSON.stringify(remarkPayload, null, 2)}
          </pre>
          <FootnoteText className="text-text-tertiary">{t('walletDetails.proxies.verifyRemarkInfoHint')}</FootnoteText>
        </div>
      </Popover.Content>
    </Popover>
  );
};

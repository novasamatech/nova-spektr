import { type PropsWithChildren } from 'react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Button, Countdown, FootnoteText, Icon, InfoLink, SmallTitleText } from '@/shared/ui';
import { Skeleton } from '@/shared/ui-kit';
import { TROUBLESHOOTING_URL, getMetadataPortalMetadataUrl } from '../common/constants';

type Props = {
  countdown: number | null;
  chainId: ChainId;
  isLegacyQR?: boolean;
  testId?: string;
  tabSlot?: React.ReactNode;
  onQrReset: () => void;
};

export const QrGeneratorContainer = ({
  countdown,
  chainId,
  children,
  testId,
  tabSlot,
  onQrReset,
  isLegacyQR = true,
}: PropsWithChildren<Props>) => {
  const { t } = useI18n();

  return (
    <section className="flex flex-1 flex-col items-center">
      <SmallTitleText>{t('signing.scanQrTitle')}</SmallTitleText>

      {countdown === null ? (
        <div className="z-1 mt-2 mb-6 flex items-center gap-x-2">
          <FootnoteText className="text-text-tertiary">{t('signing.qrCountdownTitle')}</FootnoteText>
          <Skeleton width="50px" height="20px" />
        </div>
      ) : (
        <Countdown countdown={children ? countdown : 0} className="mb-4" />
      )}

      {tabSlot && <div className="w-[250px]">{tabSlot}</div>}

      <div
        className="relative flex min-h-[250px] w-[250px] flex-col items-center justify-center gap-y-4"
        data-testid={testId}
      >
        {children &&
          (countdown === null || countdown > 0 ? (
            children
          ) : (
            <>
              {/* qr expired */}
              <Icon name="qrFrame" className="absolute h-full w-full" />
              <FootnoteText>{t('signing.qrNotValid')}</FootnoteText>
              <Button className="z-10" size="sm" prefixElement={<Icon size={16} name="refresh" />} onClick={onQrReset}>
                {t('signing.generateNewQrButton')}
              </Button>
            </>
          ))}
      </div>

      <div className="mt-6 mb-4 flex flex-row items-center gap-x-2 py-1">
        <InfoLink url={TROUBLESHOOTING_URL}>{t('signing.troubleshootingLink')}</InfoLink>

        {isLegacyQR && (
          <>
            <span className="h-4 border border-divider"></span>
            <InfoLink url={getMetadataPortalMetadataUrl(chainId)}>{t('signing.metadataPortalLink')}</InfoLink>
          </>
        )}
      </div>
    </section>
  );
};

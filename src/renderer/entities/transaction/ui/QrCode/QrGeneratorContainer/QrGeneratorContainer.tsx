import { type PropsWithChildren } from 'react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Button, Countdown, FootnoteText, Icon, InfoLink, Shimmering, SmallTitleText } from '@/shared/ui';
import { TROUBLESHOOTING_URL, getMetadataPortalMetadataUrl } from '../common/constants';

type Props = {
  countdown: number;
  chainId: ChainId;
  onQrReset: () => void;
};

export const QrGeneratorContainer = ({ countdown, chainId, children, onQrReset }: PropsWithChildren<Props>) => {
  const { t } = useI18n();

  return (
    <section className="flex flex-1 flex-col items-center">
      <SmallTitleText>{t('signing.scanQrTitle')}</SmallTitleText>

      <Countdown countdown={children ? countdown : 0} className="mb-4" />

      <div className="relative flex h-[240px] w-[240px] flex-col items-center justify-center gap-y-4">
        {children &&
          (countdown > 0 ? (
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

        {!children && <Shimmering />}
      </div>

      <div className="mb-4 mt-6 flex flex-row items-center gap-x-2 py-1">
        <InfoLink url={TROUBLESHOOTING_URL}>{t('signing.troubleshootingLink')}</InfoLink>

        <span className="h-4 border border-divider"></span>

        <InfoLink url={getMetadataPortalMetadataUrl(chainId)}>{t('signing.metadataPortalLink')}</InfoLink>
      </div>
    </section>
  );
};

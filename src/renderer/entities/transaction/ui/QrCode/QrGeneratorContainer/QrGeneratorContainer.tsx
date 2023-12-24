import { PropsWithChildren } from 'react';

import { useI18n } from '@app/providers';
import type { ChainId } from '@shared/core';
import { Button, FootnoteText, InfoLink, SmallTitleText, Icon, Shimmering, Countdown } from '@shared/ui';
import { getMetadataPortalMetadataUrl, TROUBLESHOOTING_URL } from '../common/constants';

type Props = {
  countdown: number;
  onQrReset: () => void;
  chainId: ChainId;
};

export const QrGeneratorContainer = ({ countdown, onQrReset, chainId, children }: PropsWithChildren<Props>) => {
  const { t } = useI18n();

  return (
    <section className="flex flex-col items-center flex-1">
      <SmallTitleText>{t('signing.scanQrTitle')}</SmallTitleText>

      <Countdown countdown={children ? countdown : 0} className="mb-4" />

      <div className="w-[240px] h-[240px] relative flex flex-col items-center justify-center gap-y-4">
        {children &&
          (countdown > 0 ? (
            children
          ) : (
            <>
              {/* qr expired */}
              <Icon name="qrFrame" className="absolute w-full h-full" />
              <FootnoteText>{t('signing.qrNotValid')}</FootnoteText>
              <Button className="z-10" size="sm" prefixElement={<Icon size={16} name="refresh" />} onClick={onQrReset}>
                {t('signing.generateNewQrButton')}
              </Button>
            </>
          ))}

        {!children && <Shimmering />}
      </div>

      <div className="flex flex-row items-center gap-x-2 mt-6 mb-4 py-1">
        <InfoLink url={TROUBLESHOOTING_URL}>{t('signing.troubleshootingLink')}</InfoLink>

        <span className="border border-divider h-4"></span>

        <InfoLink url={getMetadataPortalMetadataUrl(chainId)}>{t('signing.metadataPortalLink')}</InfoLink>
      </div>
    </section>
  );
};

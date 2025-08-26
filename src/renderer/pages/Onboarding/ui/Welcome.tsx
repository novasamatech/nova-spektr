import { throttle } from 'lodash';
import { useLayoutEffect, useRef, useState } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { Icon, TitleText } from '@/shared/ui';
import { Box, ScrollArea } from '@/shared/ui-kit';

import PrivacyPolicy from './PrivacyPolicy';

const LOGO_WIDTH = 232;
const RIGHT_PADDING = 225;

export const onboardingActionsSlot = createSlot();

export const Welcome = () => {
  const { t } = useI18n();

  const logo = useRef<HTMLDivElement>(null);
  const [fixed, setFixed] = useState(true);

  useLayoutEffect(() => {
    function handleResize() {
      const width = logo.current?.clientWidth || 0;

      setFixed((width - LOGO_WIDTH) / 2 < RIGHT_PADDING);
    }

    handleResize();
    window.addEventListener('resize', throttle(handleResize, 16));

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="flex h-full w-full animate-in fade-in">
      <div className="flex h-full w-[512px] flex-col">
        <TitleText className="px-10 pt-10 pb-4">{t('onboarding.welcome.title')}</TitleText>

        <ScrollArea>
          <Box direction="column" gap={4} padding={[4, 10]}>
            <Slot id={onboardingActionsSlot} />
          </Box>
        </ScrollArea>

        <div className="flex flex-1 items-end px-10 pt-4 pb-10">
          <PrivacyPolicy />
        </div>
      </div>
      <div
        ref={logo}
        className="logo-background relative flex h-full flex-1 flex-col items-end justify-center bg-input-background-disabled"
      >
        <div className={cnTw('relative w-fit', fixed ? `pr-[225px]` : 'self-center')}>
          <Icon name="logoTitle" className="-scale-y-100" size={LOGO_WIDTH} />
        </div>
      </div>
    </div>
  );
};

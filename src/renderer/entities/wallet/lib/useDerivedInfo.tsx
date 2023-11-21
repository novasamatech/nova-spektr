import { InfoSection } from '@renderer/shared/ui/Popovers/InfoPopover/InfoPopover';
import { useI18n } from '@renderer/app/providers';

type InfoProps = {
  derivationPath: string;
};
export const useDerivedInfo = ({ derivationPath }: InfoProps): InfoSection[] => {
  const { t } = useI18n();

  const infoSection: InfoSection = {
    title: t('info.derivationPathTitle'),
    items: [{ id: derivationPath, value: derivationPath }],
  };
  const popoverItems = [infoSection];

  return popoverItems;
};

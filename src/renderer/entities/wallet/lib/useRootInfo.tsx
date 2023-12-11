import { InfoSection } from '@renderer/shared/ui/Popovers/InfoPopover/InfoPopover';
import type { Address } from '@renderer/shared/core';
import { useI18n } from '@renderer/app/providers';

type InfoProps = {
  address: Address;
};
export const useRootInfo = ({ address }: InfoProps): InfoSection[] => {
  const { t } = useI18n();

  const infoSection: InfoSection = { title: t('info.publicKeyTitle'), items: [{ id: address, value: address }] };
  const popoverItems = [infoSection];

  return popoverItems;
};

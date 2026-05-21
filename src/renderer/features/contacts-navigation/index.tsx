import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { Paths } from '@/shared/routes';
import { modalsSlot, navigationTopLinksPipeline } from '@/features/app-shell';
import { BackendConfigurationModal } from '@/features/contacts';

import { AddressBookReconnectPill } from './ui/AddressBookReconnectPill';
import { AddressBookStatusDot } from './ui/AddressBookStatusDot';

export const contactsNavigationFeature = createFeature({
  name: 'contacts/navigation',
  enable: $features.map(({ contacts }) => contacts),
});

contactsNavigationFeature.inject(navigationTopLinksPipeline, (items) => {
  return items.concat({
    order: 5,
    icon: 'addressBook',
    title: 'navigation.addressBookLabel',
    link: Paths.ADDRESS_BOOK,
    iconBadge: <AddressBookStatusDot />,
    trailingAction: <AddressBookReconnectPill />,
  });
});

contactsNavigationFeature.inject(modalsSlot, BackendConfigurationModal);

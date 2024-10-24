import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/effector';
import { Paths } from '@/shared/routes';
import { navigationTopLinks } from '@/features/app-shell';

export const contactsNavigationFeature = createFeature({
  name: 'Contacts navigation',
  enable: $features.map(({ contacts }) => contacts),
});

contactsNavigationFeature.inject(navigationTopLinks, (items) => {
  return items.concat({
    order: 5,
    icon: 'addressBook',
    title: 'navigation.addressBookLabel',
    link: Paths.ADDRESS_BOOK,
  });
});

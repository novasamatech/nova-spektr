import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/effector';
import { Paths } from '@/shared/routes';
import { navigationTopLinksPipeline } from '@/features/app-shell';

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
  });
});

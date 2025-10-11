import { Paths, createLink } from '@/shared/routes';
import { navigationTopLinksPipeline } from '@/features/app-shell';
import { dappSlot } from '@/pages/Dapp';

import { DAPP_LIST } from './constants';
import { dappBrowserFeature } from './model/feature';
import { DappContainer } from './ui/DappContainer';

export { dappBrowserFeature };

dappBrowserFeature.inject(navigationTopLinksPipeline, (links) => {
  return links.concat(
    DAPP_LIST.map((dapp, index) => ({
      title: dapp.title,
      icon: 'stake',
      order: 1000 + index,
      link: createLink(Paths.DAPP, { id: dapp.id }),
    })),
  );
});

dappBrowserFeature.inject(dappSlot, ({ id }) => {
  return <DappContainer id={id} />;
});

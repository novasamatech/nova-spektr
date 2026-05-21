import { useUnit } from 'effector-react';

import { viewDetailsModel } from '../../model/view-details-model';

import { WalletDetails } from './WalletDetails';

// Always-mounted at app root. Renders the WalletDetails modal off the
// `viewDetailsModel.$wallet` store so the modal survives independently of the
// wallet-selector Popover that triggered it.
export const ViewDetailsMount = () => {
  const wallet = useUnit(viewDetailsModel.$wallet);

  return <WalletDetails wallet={wallet} isOpen={Boolean(wallet)} onClose={() => viewDetailsModel.closed()} />;
};

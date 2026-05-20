import { useUnit } from 'effector-react';
import { type PropsWithChildren } from 'react';

import { backendContactsModel } from '@/features/contacts';

import { ReconnectAddressBookButton } from './ReconnectAddressBookButton';

type Props = {
  /**
   * Optional override of the health signal. Defaults to
   * `backendContactsModel.$isHealthy`. Pass an externally-derived value when
   * the host needs to combine health with other gates.
   */
  isHealthy?: boolean;
};

/**
 * Wraps any block that depends on a healthy address-book connection. When the
 * address book is offline, a dim+blur overlay covers the children and surfaces
 * a Reconnect button — same affordance used in `DraftsSection`.
 */
export const AddressBookHealthOverlay = ({ isHealthy: isHealthyOverride, children }: PropsWithChildren<Props>) => {
  const isHealthyFromStore = useUnit(backendContactsModel.$isHealthy);
  const isHealthy = isHealthyOverride ?? isHealthyFromStore;

  return (
    <div className="relative">
      {children}
      {!isHealthy && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-block-background-default/70 backdrop-blur-[2px]">
          <div className="rounded-full bg-background-default">
            <ReconnectAddressBookButton />
          </div>
        </div>
      )}
    </div>
  );
};

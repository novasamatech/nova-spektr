import { HelpText, IconButton } from '@shared/ui';
import { cnTw } from '@shared/lib/utils';
import { AccountAddressProps, AccountAddress, getAddress } from '../AccountAddress/AccountAddress';
import type { Explorer } from '@shared/core';
import { ExplorersPopover } from '../ExplorersPopover/ExplorersPopover';
import { useI18n } from '@app/providers';

type Props = {
  matrixId?: string;
  explorers?: Explorer[];
  position?: string;
  wrapperClassName?: string;
} & AccountAddressProps;

export const AddressWithExplorers = ({
  matrixId,
  explorers = [],
  position,
  wrapperClassName,
  ...addressProps
}: Props) => {
  const { t } = useI18n();

  const button = (
    <div
      className={cnTw(
        'group flex items-center gap-x-1 px-2 h-6 rounded cursor-pointer transition-colors',
        'hover:bg-action-background-hover focus-within:bg-action-background-hover',
        wrapperClassName,
      )}
    >
      <AccountAddress
        className="w-full"
        addressFont="text-text-secondary group-hover:text-text-primary group-focus-within:text-text-primary"
        {...addressProps}
      />
      <IconButton name="info" />
    </div>
  );

  return (
    <ExplorersPopover button={button} address={getAddress(addressProps)} explorers={explorers}>
      <ExplorersPopover.Group active={Boolean(matrixId)} title={t('general.explorers.matrixIdTitle')}>
        <HelpText className="text-text-secondary break-all">{matrixId}</HelpText>
      </ExplorersPopover.Group>
    </ExplorersPopover>
  );
};

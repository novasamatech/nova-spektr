import { useI18n } from '@app/providers';
import { type Explorer } from '@shared/core';
import { cnTw } from '@shared/lib/utils';
import { HelpText, IconButton } from '@shared/ui';
import { AccountAddress, type AccountAddressProps, getAddress } from '../AccountAddress/AccountAddress';
import { ExplorersPopover } from '../ExplorersPopover/ExplorersPopover';

type Props = {
  explorers?: Explorer[];
  position?: string;
  wrapperClassName?: string;
  matrixId?: string;
} & AccountAddressProps;

export const AddressWithExplorers = ({
  explorers = [],
  position,
  wrapperClassName,
  matrixId,
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
      <IconButton name="details" />
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

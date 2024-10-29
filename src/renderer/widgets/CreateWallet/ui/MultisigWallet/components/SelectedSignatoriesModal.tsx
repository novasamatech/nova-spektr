import { useI18n } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { BaseModal } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { type SignatoryInfo } from '@/widgets/CreateWallet/lib/types';

type Props = {
  addressPrefix?: number;
  isOpen: boolean;
  signatories: Omit<SignatoryInfo, 'index'>[];
  onClose: () => void;
};

export const SelectedSignatoriesModal = ({ isOpen, signatories, onClose, addressPrefix }: Props) => {
  const { t } = useI18n();

  return (
    <BaseModal
      closeButton
      contentClass="pb-3 pt-2"
      panelClass="w-modal-sm max-h-[660px] overflow-x-hidden"
      title={t('createMultisigAccount.selectedSignatoriesTitle')}
      isOpen={isOpen}
      onClose={onClose}
    >
      <section>
        <ul className="flex flex-col [overflow-y:overlay]">
          {signatories.map(({ address, name }) => (
            <li key={address} className="mb-2 ml-5 mr-2">
              <Address
                showIcon
                iconSize={24}
                variant="truncate"
                title={name}
                address={toAddress(address, { prefix: addressPrefix })}
              />
            </li>
          ))}
        </ul>
      </section>
    </BaseModal>
  );
};

import { type Explorer } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAccountId } from '@/shared/lib/utils';
import { BaseModal } from '@/shared/ui';
import { AddressWithExplorers } from '@/entities/wallet';
import { type SignatoryInfo } from '@/widgets/CreateWallet/lib/types';

type Props = {
  addressPrefix?: number;
  isOpen: boolean;
  signatories: Omit<SignatoryInfo, 'index'>[];
  onClose: () => void;
  explorers?: Explorer[];
};

export const SelectedSignatoriesModal = ({ isOpen, signatories, onClose, explorers, addressPrefix }: Props) => {
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
          {signatories.map(({ address }) => (
            <li
              key={address}
              className="group grid h-10 shrink-0 grid-cols-[1fr,40px] items-center pl-5 pr-2 hover:bg-hover"
            >
              <AddressWithExplorers
                type="adaptive"
                className="w-[160px]"
                accountId={toAccountId(address)}
                addressPrefix={addressPrefix}
                explorers={explorers}
              />
            </li>
          ))}
        </ul>
      </section>
    </BaseModal>
  );
};

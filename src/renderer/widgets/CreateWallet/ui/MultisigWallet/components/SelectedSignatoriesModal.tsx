import { useI18n } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { BaseModal, BodyText, Identicon } from '@/shared/ui';
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
            <li key={address} className="mb-2 ml-5 mr-2 flex items-center">
              <Identicon className="inline-block" address={address} size={26} background={false} />
              <div className="ml-2 flex flex-col text-text-secondary">
                {name && <BodyText className="text-text-secondary">{name}</BodyText>}
                <BodyText className="text-text-tertiary">
                  {toAddress(address, { prefix: addressPrefix, chunk: 6 })}
                </BodyText>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </BaseModal>
  );
};

import { useI18n } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { Address } from '@/shared/ui-entities';
import { Modal } from '@/shared/ui-kit';

interface SignatoryInfo {
  index: number;
  name: string;
  address: string;
}

type Props = {
  addressPrefix?: number;
  signatories: Omit<SignatoryInfo, 'index'>[];
  children: React.ReactNode;
};

export const SelectedSignatoriesModal = ({ signatories, addressPrefix, children }: Props) => {
  const { t } = useI18n();

  return (
    <Modal size="sm">
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>{t('createMultisigAccount.selectedSignatoriesTitle')}</Modal.Title>
      <Modal.Content>
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
      </Modal.Content>
    </Modal>
  );
};

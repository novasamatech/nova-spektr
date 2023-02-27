import { Explorers } from '@renderer/components/common';
import { Address, Balance, BaseModal, Table } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Explorer } from '@renderer/domain/chain';
import { AccountDS } from '@renderer/services/storage';

type Props = {
  isOpen: boolean;
  accounts: AccountDS[];
  amount?: string;
  asset: Asset;
  explorers?: Explorer[];
  addressPrefix?: number;
  onClose: () => void;
};

const AccountsModal = ({ isOpen, accounts, amount, asset, explorers, addressPrefix, onClose }: Props) => {
  const { t } = useI18n();

  return (
    <BaseModal
      closeButton
      contentClass="w-[470px] mt-7 pb-5 px-5"
      title={t('staking.confirmation.accountsTitle')}
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className="overflow-y-auto max-h-[600px]">
        <Table by="address" dataSource={accounts}>
          <Table.Header hidden>
            <Table.Column dataKey="name" align="left" />
            {amount && <Table.Column dataKey="amount" width={200} />}
            <Table.Column dataKey="actions" width={50} />
          </Table.Header>
          <Table.Body<Required<AccountDS>>>
            {({ accountId, name, signingType }) => (
              <Table.Row key={accountId} className="bg-shade-1" height="lg">
                <Table.Cell>
                  <div className="flex items-center gap-x-1.5">
                    <Address address={accountId} name={name} signType={signingType} size={30} />
                  </div>
                </Table.Cell>
                {amount && (
                  <Table.Cell>
                    <Balance
                      className="font-semibold text-xs"
                      value={amount}
                      precision={asset.precision}
                      symbol={asset.symbol}
                    />
                  </Table.Cell>
                )}
                <Table.Cell>
                  <Explorers address={accountId} explorers={explorers} addressPrefix={addressPrefix} />
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      </div>
    </BaseModal>
  );
};

export default AccountsModal;

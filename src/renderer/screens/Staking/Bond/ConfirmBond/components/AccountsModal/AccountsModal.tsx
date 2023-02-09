import { Explorers } from '@renderer/components/common';
import { Balance, BaseModal, Identicon, Table } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Explorer } from '@renderer/domain/chain';
import { AccountDS } from '@renderer/services/storage';

type Props = {
  isOpen: boolean;
  accounts: AccountDS[];
  amount: string;
  asset: Asset;
  explorers?: Explorer[];
  addressPrefix?: number;
  onClose: () => void;
};

const AccountsModal = ({ isOpen, accounts, amount, asset, explorers, addressPrefix, onClose }: Props) => {
  const { t } = useI18n();

  return (
    <BaseModal closeButton title={t('staking.confirmation.accountsTitle')} isOpen={isOpen} onClose={onClose}>
      <Table by="address" dataSource={accounts} className="w-[470px] mt-7">
        <Table.Header hidden>
          <Table.Column dataKey="name" align="left" />
          <Table.Column dataKey="amount" width={200} />
          <Table.Column dataKey="actions" width={50} />
        </Table.Header>
        <Table.Body<Required<AccountDS>>>
          {({ accountId, name }) => (
            <Table.Row key={accountId} className="bg-shade-1" height="lg">
              <Table.Cell>
                <div className="grid grid-flow-col gap-x-1">
                  <Identicon className="row-span-2 self-center" address={accountId} background={false} />
                  <p className="text-neutral text-sm font-semibold">{name}</p> {/* TODO: add full account name */}
                </div>
              </Table.Cell>
              <Table.Cell>
                <Balance
                  className="font-semibold text-xs"
                  value={amount}
                  precision={asset.precision}
                  symbol={asset.symbol}
                />
              </Table.Cell>
              <Table.Cell>
                <Explorers address={accountId} explorers={explorers} addressPrefix={addressPrefix} />
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table>
    </BaseModal>
  );
};

export default AccountsModal;

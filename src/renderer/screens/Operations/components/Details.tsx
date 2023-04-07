import { useI18n } from '@renderer/context/I18nContext';
import { MultisigTransactionDS } from '@renderer/services/storage';
import { MultisigAccount } from '@renderer/domain/account';
import { Address, Balance, Button, Icon } from '@renderer/components/ui';
import Truncate from '@renderer/components/ui/Truncate/Truncate';
import { copyToClipboard } from '@renderer/shared/utils/strings';
import { useToggle } from '@renderer/shared/hooks';
import { ExtendedChain } from '@renderer/services/network/common/types';
import { Explorers } from '@renderer/components/common';
import { getMultisigExtrinsicLink } from '../common/utils';

type Props = {
  tx: MultisigTransactionDS & { rowIndex: number };
  account?: MultisigAccount;
  connection?: ExtendedChain;
  withAdvanced?: boolean;
};

const Details = ({ tx, account, connection, withAdvanced = true }: Props) => {
  const { indexCreated, blockCreated, deposit, depositor, callHash, callData, transaction } = tx;

  const { t } = useI18n();

  const [isAdvancedShown, toggleAdvanced] = useToggle();

  const defaultAsset = connection?.assets[0];

  const depositorSignatory = account?.signatories.find((s) => s.publicKey === depositor);

  const extrinsicLink = getMultisigExtrinsicLink(callHash, indexCreated, blockCreated, connection?.explorers);

  return (
    <>
      <ul>
        {transaction?.args.dest && (
          <li className="flex justify-between items-center">
            <div className="text-shade-40">{t('operation.details.recipient')}</div>
            <div className="flex items-center gap-1">
              <Address address={transaction?.args.dest} />
              <Explorers address={transaction.args.dest || ''} explorers={connection?.explorers} />
            </div>
          </li>
        )}

        {transaction?.args.payee && (
          <li className="flex justify-between items-center">
            <div className="text-shade-40">{t('operation.details.payee')}</div>
            <div className="flex items-center gap-1">
              {transaction.args.payee.AccountId ? (
                <>
                  <Address address={transaction.args.payee.AccountId} />
                  <Explorers address={transaction.args.payee.AccountId || ''} explorers={connection?.explorers} />
                </>
              ) : (
                transaction.args.payee
              )}
            </div>
          </li>
        )}

        {transaction?.args.controller && (
          <li className="flex justify-between items-center">
            <div className="text-shade-40">{t('operation.details.payee')}</div>
            <div className="flex items-center gap-1">
              <Address address={transaction.args.controller} />
              <Explorers address={transaction.args.controller || ''} explorers={connection?.explorers} />
            </div>
          </li>
        )}

        {isAdvancedShown && (
          <>
            {account && (
              <li className="flex justify-between items-center">
                <div className="text-shade-40">{t('operation.details.sender')}</div>
                <div className="flex items-center gap-1">
                  <Address address={account.accountId || ''} name={account.name} canCopy />
                  <Explorers address={account.accountId || ''} explorers={connection?.explorers} />
                </div>
              </li>
            )}

            {callHash && (
              <li className="flex justify-between items-center">
                <div className="text-shade-40">{t('operation.details.callHash')}</div>
                <div className="flex items-center">
                  <Truncate className="max-w-[120px]" text={callHash} />
                  <Button variant="text" pallet="shade" onClick={() => copyToClipboard(callHash)}>
                    <Icon name="copy" />
                  </Button>
                </div>
              </li>
            )}

            {callData && (
              <li className="flex justify-between items-center">
                <div className="text-shade-40">{t('operation.details.callData')}</div>
                <div className="flex items-center">
                  <Truncate className="max-w-[120px]" text={callData} />
                  <Button variant="text" pallet="shade" onClick={() => copyToClipboard(callData)}>
                    <Icon name="copy" />
                  </Button>
                </div>
              </li>
            )}

            {depositorSignatory && (
              <li className="flex justify-between items-center">
                <div className="text-shade-40">{t('operation.details.depositor')}</div>
                <div className="flex gap-1">
                  <Address address={depositorSignatory.accountId} name={depositorSignatory.name} canCopy />
                  <Explorers address={depositorSignatory.accountId} explorers={connection?.explorers} />
                </div>
              </li>
            )}

            {deposit && defaultAsset && (
              <li className="flex justify-between items-center">
                <div className="text-shade-40">{t('operation.details.deposit')}</div>
                <Balance value={deposit} precision={defaultAsset.precision} symbol={defaultAsset?.symbol} />
              </li>
            )}

            {indexCreated && blockCreated && (
              <li className="flex justify-between items-center">
                <div className="text-shade-40">{t('operation.details.timePoint')}</div>
                <div className="flex gap-1">
                  {blockCreated}-{indexCreated}
                  {extrinsicLink && (
                    <a href={extrinsicLink} target="_blank" rel="noopener noreferrer">
                      <Icon className="text-shade-40" name="globe" />
                    </a>
                  )}
                </div>
              </li>
            )}
          </>
        )}
      </ul>

      {withAdvanced && (
        <Button
          variant="text"
          pallet="primary"
          prefixElement={<Icon name={isAdvancedShown ? 'up' : 'down'} />}
          onClick={toggleAdvanced}
        >
          {t('operation.advanced')}
        </Button>
      )}
    </>
  );
};

export default Details;

import { HexString } from '@polkadot/util/types';

import BaseModal from '../Modals/BaseModal/BaseModal';
import { useI18n, useNetworkContext, useWalletConnectClient } from '@renderer/app/providers';
import Button from '../Buttons/Button/Button';
import { TransactionType, useTransaction } from '@renderer/entities/transaction';
import { ChainId } from '@renderer/domain/shared-kernel';
import { DEFAULT_POLKADOT_METHODS } from '@renderer/app/providers/context/WalletConnectContext/const';

type Props = {
  isOpen: boolean;
  size?: number;
  onClose: () => void;
};

const WalletConnectQR = ({ isOpen, onClose, size = 240 }: Props) => {
  const { t } = useI18n();
  const { connect, client, pairings, session, isInitializing } = useWalletConnectClient();
  const { getSignedExtrinsic, createPayload, submitAndWatchExtrinsic } = useTransaction();
  const { connections } = useNetworkContext();

  const signTransaction = async () => {
    const connection = Object.values(connections).find((c) => c.chainId.includes('e143f23803ac50e8f6f8e62695d1ce9e'));

    if (!connection?.api || !client || !session) return;

    const transaction = {
      type: TransactionType.TRANSFER,
      address: '5HE2GqLBSY9QJsWTqaeb4UQXFhuiKDKYbnx4ZV6mQduVNDR9',
      chainId: '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e' as ChainId,
      args: {
        dest: '5HE2GqLBSY9QJsWTqaeb4UQXFhuiKDKYbnx4ZV6mQduVNDR9',
        value: '100000',
      },
    };

    const { unsigned } = await createPayload(transaction, connection.api);

    const result = await client.request<{
      payload: string;
      signature: string;
    }>({
      chainId: 'polkadot:e143f23803ac50e8f6f8e62695d1ce9e',
      topic: session.topic,
      request: {
        method: DEFAULT_POLKADOT_METHODS.POLKADOT_SIGN_TRANSACTION,
        params: {
          address: '5HE2GqLBSY9QJsWTqaeb4UQXFhuiKDKYbnx4ZV6mQduVNDR9',
          transactionPayload: unsigned,
        },
      },
    });

    const extrinsic = await getSignedExtrinsic(
      unsigned,
      (result as { signature: HexString }).signature,
      connection.api,
    );

    submitAndWatchExtrinsic(extrinsic, unsigned, connection.api, async (executed, params) => {
      if (executed) {
        console.log('submit result params', params);
      }
    });
  };

  return (
    <BaseModal
      closeButton
      contentClass="px-5 pb-4 w-[440px]"
      panelClass="w-max"
      headerClass="py-3 px-5 max-w-[440px]"
      isOpen={isOpen}
      title={'Connect wallet connect'}
      onClose={onClose}
    >
      {session ? (
        <>{!isInitializing && <Button onClick={() => signTransaction()}> {t('Sign transaction')}</Button>}</>
      ) : (
        <>
          {!isInitializing && (
            <Button onClick={() => connect(pairings.length > 0 ? pairings[pairings.length - 1] : undefined)}>
              {t('Connect')}
            </Button>
          )}
        </>
      )}
    </BaseModal>
  );
};

export default WalletConnectQR;

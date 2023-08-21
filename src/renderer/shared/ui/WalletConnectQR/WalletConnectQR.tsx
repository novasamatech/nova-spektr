import { useEffect, useState } from 'react';
import Provider, { UniversalProvider } from '@walletconnect/universal-provider';
import { WalletConnectModal } from '@walletconnect/modal';

import BaseModal from '../Modals/BaseModal/BaseModal';
import QrSimpleTextGenerator from '@renderer/components/common/QrCode/QrGenerator/QrSimpleTextGenerator';
import { useNetworkContext } from '@renderer/app/providers';
import { TransactionType, useTransaction } from '@renderer/entities/transaction';
import { ChainId, HexString } from '@renderer/domain/shared-kernel';

type Props = {
  isOpen: boolean;
  size?: number;
  onClose: () => void;
};

const PROJECT_ID = '4fae85e642724ee66587fa9f37b997e2';
const metadata = {
  name: 'Nova Spektr', //dApp name
  description: 'Nova Spektr Enterprise Wallet', //dApp description
  url: '#', //dApp url
  icons: ['https://walletconnect.com/walletconnect-logo.png'], //dApp logo url
};

const WalletConnectQR = ({ isOpen, onClose, size = 240 }: Props) => {
  const [uri, setUri] = useState<string>();
  const [provider, setProvider] = useState<Provider>();

  const { connections } = useNetworkContext();
  const { createPayload, getSignedExtrinsic, submitAndWatchExtrinsic } = useTransaction();

  useEffect(() => {
    const justConnect = true;
    if (justConnect) {
      makeConnection();
    } else {
      signTransaction();
    }
  }, []);

  const params = {
    optionalNamespaces: {
      polkadot: {
        methods: ['polkadot_signTransaction', 'polkadot_signMessage'],
        //eslint-disable-next-line i18next/no-literal-string
        chains: Object.values(connections).map((c) => `polkadot:${c.chainId.slice(2, 34)}`),
        events: ['chainChanged", "accountsChanged'],
      },
    },
  };

  const makeConnection = async () => {
    try {
      const universalProvider = await UniversalProvider.init({
        projectId: PROJECT_ID,
        metadata,
        logger: 'debug',
      });

      setProvider(provider);

      const { uri, approval } = await universalProvider.client.connect(params);

      if (uri) {
        setUri(uri);

        const walletConnectModal = new WalletConnectModal({
          projectId: PROJECT_ID,
        });

        walletConnectModal.openModal({ uri });

        const session = await approval();
        console.log('session', session);

        walletConnectModal.closeModal();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const signTransaction = async () => {
    const universalProvider = await UniversalProvider.init({
      projectId: PROJECT_ID,
      metadata,
      logger: 'debug',
    });
    setProvider(universalProvider);

    await universalProvider.connect(params);
    const sessions = universalProvider.client.session.getAll();
    console.log(sessions);
    const connection = Object.values(connections).find((c) => c.chainId.includes('e143f23803ac50e8f6f8e62695d1ce9e'));

    if (!connection?.api) return;

    const transaction = {
      type: TransactionType.TRANSFER,
      address: '5HE2GqLBSY9QJsWTqaeb4UQXFhuiKDKYbnx4ZV6mQduVNDR9',
      chainId: '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e' as ChainId,
      args: {
        dest: '5HE2GqLBSY9QJsWTqaeb4UQXFhuiKDKYbnx4ZV6mQduVNDR9',
        value: '1',
      },
    };

    const { unsigned } = await createPayload(transaction, connection.api);

    const result = await universalProvider.client.request({
      chainId: 'polkadot:e143f23803ac50e8f6f8e62695d1ce9e',
      topic: '98a83c1052624b30420286a258eb46dd9468ec9ec548f448efe65bbe1063ee00',
      request: {
        method: 'polkadot_signTransaction',
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
      {uri && <QrSimpleTextGenerator payload={uri} size={size} />}
    </BaseModal>
  );
};

export default WalletConnectQR;

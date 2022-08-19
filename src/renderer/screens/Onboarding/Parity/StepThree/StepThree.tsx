import { useEffect, useState } from 'react';

import { Button, Identicon, Input } from '@renderer/components/ui';
import { useWallet } from '@renderer/services/wallet/walletService';
import { createSimpleWallet, WalletType } from '@renderer/domain/wallet';
import { useChains } from '@renderer/services/network/chainsService';
import { Chain } from '@renderer/services/network/common/types';
import { AccountsList } from '@renderer/components/common';
import { toPublicKey } from '@renderer/utils/address';

type Props = {
  ss58Address: string;
  onNextStep: () => void;
  onPrevStep: () => void;
};

const StepThree = ({ ss58Address, onNextStep, onPrevStep }: Props) => {
  const { getChainsData } = useChains();
  const { addWallet, setActiveWallet } = useWallet();
  const [walletName, setWalletName] = useState('');
  const [chains, setChains] = useState<Chain[]>([]);
  const [address, setAddress] = useState('');

  useEffect(() => {
    (async () => {
      const chains = await getChainsData();
      setChains(chains);
    })();
  }, []);

  const correctAddress = address && address.length === 48;
  const publicKey = correctAddress && toPublicKey(address);

  const createWallet = async () => {
    if (!publicKey || publicKey.length === 0) return;

    const newWallet = createSimpleWallet({
      name: walletName,
      type: WalletType.WATCH_ONLY,
      mainAccounts: [
        // createMainAccount({
        //   accountId: address,
        //   publicKey,
        // }),
      ],
      chainAccounts: [],
    });

    const walletId = await addWallet(newWallet);
    console.log(walletId);

    await setActiveWallet('1');
    // await setActiveWallet(walletId);
    onNextStep();
  };

  return (
    <div className="flex h-full flex-col gap-10 justify-center items-center">
      <h2 className="text-2xl leading-relaxed font-normal text-neutral-variant">
        Please choose a name for your wallet
      </h2>
      <div className="flex gap-10">
        <div className="flex flex-col gap-10 w-[480px]">
          <div className="flex flex-col p-4 bg-white shadow-surface rounded-2lg">
            <Input
              wrapperClass="flex items-center"
              label="Wallet name"
              placeholder="Wallet name"
              onChange={(e) => setWalletName(e.target.value)}
            />
            <p className="uppercase pt-2.5 pb-10 font-bold text-2xs text-shade-40">
              Name examples: Main account, My validator, Dotsama crowdloans, etc.
            </p>
            <Input
              label="Account address"
              placeholder="Account address"
              value={address}
              wrapperClass="flex items-center"
              onChange={(e) => setAddress(e.target.value)}
              prefixElement={<Identicon address={address} size={32} />}
              suffixElement={
                <Button variant="outline" pallet="primary" onClick={onPrevStep}>
                  Rescan QR code
                </Button>
              }
            />
          </div>
          <Button weight="lg" variant="fill" pallet="primary" onClick={createWallet}>
            Type a name to finish
          </Button>
        </div>
        <div className="flex flex-col bg-white shadow-surface rounded-2lg w-[480px] max-h-[400px]">
          <div className="p-4">
            <h2 className="text-neutral font-semibold">Here are your accounts</h2>
            <p className="text-neutral-variant font-normal">
              Following accounts have been successfully read from Parity Signer.
            </p>
          </div>
          <AccountsList chains={chains} publicKey={publicKey && publicKey.length ? publicKey : '0x'} />
        </div>
      </div>
    </div>
  );
};

export default StepThree;

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, ButtonBack, Icon, Identicon, Input } from '@renderer/components/ui';
import { AccountsList } from '@renderer/components/common';
import { useWallet } from '@renderer/services/wallet/walletService';
import { createMainAccount, createSimpleWallet, WalletType } from '@renderer/domain/wallet';
import { toPublicKey } from '@renderer/utils/address';
import Paths from '@renderer/routes/paths';
import { useChains } from '@renderer/services/network/chainsService';
import { Chain } from '@renderer/services/network/common/types';

const WatchOnly = () => {
  const navigate = useNavigate();
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
        createMainAccount({
          accountId: address,
          publicKey,
        }),
      ],
      chainAccounts: [],
    });

    const walletId = await addWallet(newWallet);

    await setActiveWallet(walletId);
    navigate(Paths.BALANCES);
  };

  return (
    <>
      <div className="flex items-center gap-x-2.5">
        <ButtonBack />
        <h1 className="text-neutral">Add watch-only Wallet</h1>
      </div>
      <div className="flex h-full flex-col gap-10 justify-center items-center">
        <h2 className="text-2xl leading-10 font-normal text-neutral-variant">
          Track the activity of any wallet without injecting your private key to Omni Enterprise
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
                name examples: Main account, My validator, Dotsama crowdloans, etc.
              </p>
              <Input
                wrapperClass="flex items-center"
                prefixElement={
                  correctAddress ? (
                    <Identicon address={address} size={32} />
                  ) : (
                    <Icon as="svg" size={24} name="emptyIdenticon" />
                  )
                }
                suffixElement={
                  <Button
                    variant="outline"
                    pallet="primary"
                    onClick={async () => {
                      const text = await navigator.clipboard.readText();
                      setAddress(text);
                    }}
                  >
                    Paste
                  </Button>
                }
                label="Account address"
                placeholder="Account address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <Button
              weight="lg"
              variant="fill"
              pallet="primary"
              disabled={!correctAddress || !walletName}
              onClick={createWallet}
            >
              {correctAddress ? 'Yes, these are my accounts' : 'Type or paste an address...'}
            </Button>
          </div>
          <div className="flex flex-col bg-white shadow-surface rounded-2lg w-[480px] max-h-[400px]">
            <div className="p-4">
              <h2 className="text-neutral font-semibold">Your accounts will be showing up here</h2>
              <p className="text-neutral-variant font-normal">All of your derived account</p>
            </div>
            {<AccountsList chains={chains} publicKey={publicKey && publicKey.length ? publicKey : '0x'} />}
          </div>
        </div>
      </div>
    </>
  );
};

export default WatchOnly;

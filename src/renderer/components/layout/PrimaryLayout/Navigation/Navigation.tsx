import cn from 'classnames';
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import { Button, Icon, Identicon } from '@renderer/components/ui';
import { useMatrix } from '@renderer/context/MatrixContext';
import Paths from '@renderer/routes/paths';

const NavItems = [
  { icon: <Icon name="wallets" />, title: 'Wallets', link: Paths.WALLETS },
  { icon: <Icon name="book" />, title: 'Address Book', link: Paths.ADDRESS_BOOK },
  { icon: <Icon name="operations" />, title: 'Operations', link: Paths.OPERATIONS },
  { icon: <Icon name="balance" />, title: 'Balances', link: Paths.BALANCES },
  { icon: <Icon name="transfer" />, title: 'Transfer', link: Paths.TRANSFER },
  { icon: <Icon name="btc" />, title: 'Chat DEV', link: Paths.CHAT_DEV },
  { icon: <Icon name="eth" />, title: 'Camera DEV', link: Paths.CAMERA_DEV },
];

const Navigation = () => {
  const navigate = useNavigate();
  const { matrix, setIsLoggedIn } = useMatrix();

  const [isProcessing, setIsProcessing] = useState(false);

  const onLogout = async () => {
    setIsProcessing(true);

    try {
      await matrix.logout();
      setIsLoggedIn(false);
      navigate(Paths.LOGIN);
    } catch (error) {
      console.warn(error);
      setIsProcessing(false);
    }
  };

  return (
    <aside className="flex gap-y-5 flex-col w-[280px] py-5 pl-5">
      <div className="bg-primary rounded-xl text-white">
        <div className="flex gap-x-2.5 pl-4 pt-4 pr-2">
          <Identicon theme="polkadot" address="5DXYNRXmNmFLFxxUjMXSzKh3vqHRDfDGGbY3BnSdQcta1SkX" size={46} />
          <button type="button" className="flex justify-between flex-1">
            <span className="text-xl leading-6 mr-1 text-left">Bob (Accountant)</span>
            <Icon name="right" size={40} className="shrink-0" />
          </button>
        </div>
        <div className="flex gap-x-1.5 px-4 pb-4 mt-7">
          <button type="button">
            <Icon name="copy" />
          </button>
          <button type="button">
            <Icon name="qr" />
          </button>
          <span className="ml-auto">$1,148.14</span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto scrollbar">
        <ul className="pr-2.5">
          {NavItems.map(({ icon, title, link }) => (
            <li key={title} className="cursor-pointer rounded-lg hover:bg-black/5 text-gray-500">
              <NavLink
                to={link}
                className={({ isActive }) =>
                  cn('flex items-center p-3 outline-offset-reduced', isActive && 'text-primary')
                }
              >
                {icon}
                <span className="font-semibold text-sm ml-3">{title}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      {matrix.isLoggedIn && (
        <Button variant="outline" pallet="primary" disabled={isProcessing} onClick={onLogout}>
          Logout
        </Button>
      )}
    </aside>
  );
};

export default Navigation;

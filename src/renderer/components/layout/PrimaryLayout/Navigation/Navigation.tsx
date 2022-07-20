import { Link } from 'react-router-dom';

import { Icon, Identicon } from '@renderer/components/ui';
import Paths from '@renderer/routes/paths';

const NavItems = [
  { icon: <Icon name="wallets" />, title: 'Wallets', link: Paths.WALLETS },
  { icon: <Icon name="book" />, title: 'Address Book', link: Paths.ADDRESS_BOOK },
  { icon: <Icon name="operations" />, title: 'Operations', link: Paths.OPERATIONS },
  { icon: <Icon name="balance" />, title: 'Balances', link: Paths.BALANCES },
  { icon: <Icon name="transfer" />, title: 'Transfer', link: Paths.TRANSFER },
  // { icon: <Icon name="asset" />, title: 'Asset management', link: Paths.ASSETS },
  // { icon: <Icon name="staking" />, title: 'Staking', link: Paths.STAKING },
  // { icon: <Icon name="governance" />, title: 'Governance', link: Paths.GOVERNANCE },
  // { icon: <Icon name="settings" />, title: 'Settings', link: Paths.SETTINGS },
  // { icon: <Icon name="crowdloans" />, title: 'Crowdloans', link: Paths.CROWDLOANS },
  // { icon: <Icon name="crowdloans" />, title: 'Crowdloans', link: Paths.CROWDLOANS },
  // { icon: <Icon name="crowdloans" />, title: 'Crowdloans', link: Paths.CROWDLOANS },
  // { icon: <Icon name="crowdloans" />, title: 'Crowdloans', link: Paths.CROWDLOANS },
  // { icon: <Icon name="crowdloans" />, title: 'Crowdloans', link: Paths.CROWDLOANS },
  // { icon: <Icon name="crowdloans" />, title: 'Crowdloans', link: Paths.CROWDLOANS },
  // { icon: <Icon name="crowdloans" />, title: 'Crowdloans', link: Paths.CROWDLOANS },
  // { icon: <Icon name="crowdloans" />, title: 'Crowdloans', link: Paths.CROWDLOANS },
  // { icon: <Icon name="crowdloans" />, title: 'Crowdloans', link: Paths.CROWDLOANS },
];

export const Navigation = () => {
  return (
    <aside className="flex gap-y-5 flex-col w-[280px] py-5 pl-5">
      <div className="bg-primary rounded-xl text-white">
        <div className="flex gap-x-2.5 pl-4 pt-4 pr-2">
          <Identicon theme="polkadot" address="5DXYNRXmNmFLFxxUjMXSzKh3vqHRDfDGGbY3BnSdQcta1SkX" size={46} />
          <span>Bob (Accountant)</span>
          <button>
            <Icon name="right" size={40} />
          </button>
        </div>
        <div className="flex gap-x-1.5 px-4 pb-4 mt-7">
          <button>
            <Icon name="copy" />
          </button>
          <button>
            <Icon name="qr" />
          </button>
          <span className="ml-auto">$1,148.14</span>
        </div>
      </div>
      <nav>
        <ul className="pr-2.5 overflow-y-auto scrollbar">
          {NavItems.map(({ icon, title, link }) => (
            <li key={title} className="p-3 cursor-pointer rounded-lg hover:bg-black/5 text-gray-500">
              <Link to={link} className="flex items-center">
                {icon}
                <span className="font-semibold text-sm ml-3">{title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

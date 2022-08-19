import { WalletType } from '@renderer/domain/wallet';

type Props = {
  walletType: WalletType;
};

const FinalStep = ({ walletType }: Props) => {
  console.log(walletType);

  return <div>final</div>;
};

export default FinalStep;

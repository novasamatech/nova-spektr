import { ApiPromise } from '@polkadot/api';

type Props = {
  api: ApiPromise;
  onResult: (data: any) => void;
};

export const Scanning = ({ api, onResult }: Props) => {
  return (
    <div>
      <div>123</div>
      <div>123</div>
    </div>
  );
};

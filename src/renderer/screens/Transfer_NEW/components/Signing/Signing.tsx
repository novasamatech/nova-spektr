import { ApiPromise } from '@polkadot/api';

type Props = {
  api: ApiPromise;
  onResult: (data: any) => void;
  onGoBack: () => void;
};

export const Signing = ({ api, onResult, onGoBack }: Props) => {
  return (
    <div>
      <div>123</div>
      <div>123</div>
    </div>
  );
};

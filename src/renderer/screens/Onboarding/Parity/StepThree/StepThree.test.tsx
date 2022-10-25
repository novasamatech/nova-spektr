import { render } from '@testing-library/react';

import { SeedInfo } from '@renderer/components/common/QrCode/QrReader/common/types';
import { CryptoTypeString } from '@renderer/domain/shared-kernel';
import StepThree from './StepThree';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Onboard/Parity/StepThree', () => {
  test('should render component', async () => {
    const data: SeedInfo = {
      name: 'test wallet',
      multiSigner: { MultiSigner: CryptoTypeString.SR25519, public: new Uint8Array([1, 2, 3]) },
      derivedKeys: [],
    };

    render(<StepThree qrData={data} onNextStep={() => {}} onPrevStep={() => {}} />);
  });
});

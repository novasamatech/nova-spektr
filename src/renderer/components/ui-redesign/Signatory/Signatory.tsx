import { Identicon } from '@renderer/components/ui';
import BodyText from '@renderer/components/ui-redesign/Typography/components/BodyText';
import { getShortAddress } from '@renderer/shared/utils/strings';

interface Props {
  address: string;
  name: string;
}
const Signatory = ({ address, name }: Props) => (
  <div className="flex flex-row gap-x-[9px] items-center">
    <Identicon background={false} size={20} address={address} />
    <div className="flex flex-col gap-0.5">
      <BodyText fontWeight="medium">{name}</BodyText>
      {/* TODO add proper font name when available */}
      <p className="leading-4 text-[11px] text-redesign-shade-48">{getShortAddress(address)}</p>
    </div>
  </div>
);

export default Signatory;

import { Icon, FootnoteText } from '@shared/ui';

type Props = {
  onClick: () => void;
};
export const Delegations = ({ onClick }: Props) => {
  return (
    <button className="border border-gray-200 rounded-sm" onClick={onClick}>
      <div className="flex flex-col gap-y-1 p-2">
        <Icon name="opengovDelegations" />
        <FootnoteText>Delegate</FootnoteText>
        {/*<AssetBalance value="1111" />*/}
      </div>
    </button>
  );
};

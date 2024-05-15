import { Icon, FootnoteText } from '@shared/ui';

export const Locks = () => {
  return (
    <div className="flex flex-col gap-y-1">
      <Icon name="opengovLock" />
      <FootnoteText>Lock</FootnoteText>
      {/*<AssetBalance value="1111" />*/}
    </div>
  );
};

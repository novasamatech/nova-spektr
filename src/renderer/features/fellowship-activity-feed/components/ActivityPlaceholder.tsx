import { BodyText, FootnoteText, HelpText } from '@/shared/ui';
import { Skeleton } from '@/shared/ui-kit';

export const ActivityPlaceholder = () => {
  return (
    <div className="flex flex-col gap-1 px-4 pt-2">
      <div className="text-button-small flex items-center gap-1">
        <div className="flex min-w-0 grow items-center">
          <BodyText>
            <Skeleton width="10ch" height="1lh" />
          </BodyText>
        </div>
        <HelpText className="h-fit">
          <Skeleton height="1em" width="5ch" />
        </HelpText>
      </div>
      <FootnoteText>
        <Skeleton width="100%" height="1lh" />
      </FootnoteText>
    </div>
  );
};

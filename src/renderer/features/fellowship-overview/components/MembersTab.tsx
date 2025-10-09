/* eslint-disable i18next/no-literal-string */
import { FootnoteText, TitleText } from '@/shared/ui/Typography';
import { Box } from '@/shared/ui-kit';

export const MembersTab = () => {
  return (
    <div className="p-5">
      <Box gap={6}>
        <Box gap={1}>
          <TitleText className="text-text-primary">Members</TitleText>
          <FootnoteText className="text-text-primary">Coming soon</FootnoteText>
        </Box>
      </Box>
    </div>
  );
};

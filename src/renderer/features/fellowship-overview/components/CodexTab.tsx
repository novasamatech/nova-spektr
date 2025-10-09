/* eslint-disable i18next/no-literal-string */
import { FootnoteText, TitleText } from '@/shared/ui/Typography';
import { Box } from '@/shared/ui-kit';

export const CodexTab = () => {
  return (
    <div className="p-6">
      <Box gap={6}>
        <Box gap={1}>
          <TitleText className="text-text-primary">Codex</TitleText>
          <FootnoteText className="text-text-primary">Coming soon</FootnoteText>
        </Box>
      </Box>
    </div>
  );
};

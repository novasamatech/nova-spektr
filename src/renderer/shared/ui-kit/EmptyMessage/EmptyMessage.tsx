import { FootnoteText, Icon, SmallTitleText } from '@/shared/ui';
import { Box } from '../Box/Box';

type Props = {
  title: string;
  description: string;
};

export const EmptyMessage = ({ title, description }: Props) => {
  return (
    <Box verticalAlign="center" horizontalAlign="center" grow={1} gap={6} width="100%" height="100%" padding={[32, 0]}>
      <Icon name="document" size={64} />
      <Box gap={2} horizontalAlign="center" width="340px">
        <SmallTitleText className="text-center">{title}</SmallTitleText>
        <FootnoteText className="text-text-tertiary text-center">{description}</FootnoteText>
      </Box>
    </Box>
  );
};

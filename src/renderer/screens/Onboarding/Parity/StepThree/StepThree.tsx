import { Button } from '@renderer/components/ui';

type Props = {
  ss58Address: string;
  onNextStep: () => void;
};

const StepThree = ({ ss58Address, onNextStep }: Props) => {
  return (
    <div>
      {ss58Address}
      <Button variant="fill" pallet="primary" onClick={onNextStep}>
        Go next
      </Button>
    </div>
  );
};

export default StepThree;

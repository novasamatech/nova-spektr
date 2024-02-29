import { useUnit } from 'effector-react';

import { networksFilterModel } from '../model/networks-filter-model';
import { SearchInput } from '@shared/ui';
import { useEffect } from 'react';

type Props = {
  className?: string;
};

export const NetworksFilter = ({ className }: Props) => {
  const filterQuery = useUnit(networksFilterModel.$filterQuery);

  useEffect(() => {
    networksFilterModel.events.formInitiated();
  }, []);

  return (
    <SearchInput
      wrapperClass={className}
      placeholder="Search"
      value={filterQuery}
      onChange={networksFilterModel.events.queryChanged}
    />
  );
};

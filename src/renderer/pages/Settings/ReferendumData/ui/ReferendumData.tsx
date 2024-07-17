import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { OffChainDataSource } from '@features/governance';

import { referendumDataModel } from '../model/referendum-data-model';

export const ReferendumData = () => {
  const navigate = useNavigate();

  useEffect(() => {
    referendumDataModel.events.navigateApiChanged({ navigate });
  }, [navigate]);

  return <OffChainDataSource />;
};

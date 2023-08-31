import { XCM_URL, XCM_KEY } from './common/constants';
import { XcmConfig, ICrossChainService } from './common/types';

export const useCrossChain = (): ICrossChainService => {
  const fetchXcmConfig = async (): Promise<XcmConfig> => {
    const response = await fetch(XCM_URL);

    return response.json();
  };

  const getXcmConfig = (): XcmConfig | null => {
    const storageConfig = localStorage.getItem(XCM_KEY);

    try {
      return storageConfig ? JSON.parse(storageConfig) : null;
    } catch (error) {
      console.error('Could not parse XCM config - ', error);

      return null;
    }
  };

  const saveXcmConfig = (config: XcmConfig) => {
    localStorage.setItem(XCM_KEY, JSON.stringify(config));
  };

  return {
    fetchXcmConfig,
    getXcmConfig,
    saveXcmConfig,
  };
};

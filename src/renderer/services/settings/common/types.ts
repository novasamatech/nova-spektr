export type ISettingsStorage = {
  getHideZeroBalance: () => boolean;
  setHideZeroBalance: (hideZeroBalance: boolean) => void;
};

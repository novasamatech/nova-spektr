import { createEvent, createStore } from 'effector';

// Controls open/close of the wallet selector Popover. Exposed so other features
// (e.g. wallet-details "View details") can dismiss the selector when opening a
// modal that should replace it visually.
const opened = createEvent();
const closed = createEvent();
const toggled = createEvent<boolean>();
const dropdownLoadingChanged = createEvent<boolean>();

const $isOpen = createStore(false)
  .on(opened, () => true)
  .on(closed, () => false)
  .on(toggled, (_, value) => value);

const $isDropdownLoading = createStore(false).on(dropdownLoadingChanged, (_, value) => value);

export const walletSelectUI = {
  $isOpen,
  $isDropdownLoading,
  opened,
  closed,
  toggled,
  dropdownLoadingChanged,
};

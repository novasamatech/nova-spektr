import { createEvent, createStore, sample } from 'effector';

const scheduleModalOpened = createEvent();
const scheduleModalClosed = createEvent();
const accountOpened = createEvent<string>();
const accountClosed = createEvent();

const $scheduleModalOpen = createStore(false)
  .on(scheduleModalOpened, () => true)
  .reset(scheduleModalClosed);

/** Key (chainId:accountId) of the account whose per-schedule modal is open. */
const $openAccountKey = createStore<string | null>(null)
  .on(accountOpened, (_, key) => key)
  .reset([accountClosed, scheduleModalClosed]);

// Closing the whole schedule modal also drops any open account drill-in.
sample({ clock: scheduleModalClosed, target: accountClosed });

export const modalModel = {
  $scheduleModalOpen,
  $openAccountKey,

  scheduleModalOpened,
  scheduleModalClosed,
  accountOpened,
  accountClosed,
};

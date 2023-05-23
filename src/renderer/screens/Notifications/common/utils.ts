export const sortByDate = ([dateA]: [string, any[]], [dateB]: [string, any[]]) =>
  new Date(dateA) < new Date(dateB) ? 1 : -1;

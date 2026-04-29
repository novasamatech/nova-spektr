export const truncateStr = (str: string, start = 7, end = 8) =>
  str.length > start + end + 3 ? `${str.slice(0, start)}...${str.slice(-end)}` : str;

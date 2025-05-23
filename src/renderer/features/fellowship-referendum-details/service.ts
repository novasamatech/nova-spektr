import { type Track } from '@/domains/collectives';

const getRankTitle = (rank: number, relatedTrack: Track[] | null | undefined) => {
  const name = relatedTrack?.find(t => t.id === rank)?.name;

  if (!name) return '';

  return name.charAt(0).toUpperCase() + name.slice(1);
};

export const detailsService = {
  getRankTitle,
};

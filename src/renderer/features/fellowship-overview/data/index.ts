import rank1Description from './rank-1/rank-1-description.md?raw';
import rank1Meta from './rank-1/rank-1-meta.json';
import rank1RequirementsDescription from './rank-1/rank-1-requirements-description.md?raw';
import rank2Description from './rank-2/rank-2-description.md?raw';
import rank2Meta from './rank-2/rank-2-meta.json';
import rank2RequirementsDescription from './rank-2/rank-2-requirements-description.md?raw';
import rank3Description from './rank-3/rank-3-description.md?raw';
import rank3Meta from './rank-3/rank-3-meta.json';
import rank3RequirementsDescription from './rank-3/rank-3-requirements-description.md?raw';
import rank4Description from './rank-4/rank-4-description.md?raw';
import rank4Meta from './rank-4/rank-4-meta.json';
import rank4RequirementsDescription from './rank-4/rank-4-requirements-description.md?raw';
import rank5Description from './rank-5/rank-5-description.md?raw';
import rank5Meta from './rank-5/rank-5-meta.json';
import rank5RequirementsDescription from './rank-5/rank-5-requirements-description.md?raw';
import rank6Description from './rank-6/rank-6-description.md?raw';
import rank6Meta from './rank-6/rank-6-meta.json';
import rank6RequirementsDescription from './rank-6/rank-6-requirements-description.md?raw';
import rank7Description from './rank-7/rank-7-description.md?raw';
import rank7Meta from './rank-7/rank-7-meta.json';
import rank7RequirementsDescription from './rank-7/rank-7-requirements-description.md?raw';
import rank8Description from './rank-8/rank-8-description.md?raw';
import rank8Meta from './rank-8/rank-8-meta.json';
import rank8RequirementsDescription from './rank-8/rank-8-requirements-description.md?raw';
import rank9Description from './rank-9/rank-9-description.md?raw';
import rank9Meta from './rank-9/rank-9-meta.json';
import rank9RequirementsDescription from './rank-9/rank-9-requirements-description.md?raw';

export interface RankData {
  rank: number;
  label: string;
  name: string;
  time: string;
  color: string;
  description: string;
  requirementsDescription: string;
  meta: {
    analogue: string;
    material: string;
    activity: string;
    agreement: string;
    timeRequired: string;
  };
}

export const RANKS_DATA: RankData[] = [
  {
    rank: 1,
    label: 'I',
    name: 'Humble',
    time: 'n/a',
    color: 'bg-gray-400',
    description: rank1Description,
    requirementsDescription: rank1RequirementsDescription,
    meta: rank1Meta,
  },
  {
    rank: 2,
    label: 'II',
    name: 'Proficient',
    time: '~1 y',
    color: 'bg-orange-400',
    description: rank2Description,
    requirementsDescription: rank2RequirementsDescription,
    meta: rank2Meta,
  },
  {
    rank: 3,
    label: 'III',
    name: 'Fellow',
    time: '~2 y',
    color: 'bg-red-300',
    description: rank3Description,
    requirementsDescription: rank3RequirementsDescription,
    meta: rank3Meta,
  },
  {
    rank: 4,
    label: 'IV',
    name: 'Architect',
    time: '>3 y',
    color: 'bg-purple-300',
    description: rank4Description,
    requirementsDescription: rank4RequirementsDescription,
    meta: rank4Meta,
  },
  {
    rank: 5,
    label: 'V',
    name: 'Architect Adept',
    time: '>4 y',
    color: 'bg-sky-300',
    description: rank5Description,
    requirementsDescription: rank5RequirementsDescription,
    meta: rank5Meta,
  },
  {
    rank: 6,
    label: 'VI',
    name: 'Grand Architect',
    time: '>5 y',
    color: 'bg-green-300',
    description: rank6Description,
    requirementsDescription: rank6RequirementsDescription,
    meta: rank6Meta,
  },
  {
    rank: 7,
    label: 'VII',
    name: 'Free Master',
    time: '>6 y',
    color: 'bg-indigo-300',
    description: rank7Description,
    requirementsDescription: rank7RequirementsDescription,
    meta: rank7Meta,
  },
  {
    rank: 8,
    label: 'VIII',
    name: 'Master Constant',
    time: '>11 y',
    color: 'bg-cyan-300',
    description: rank8Description,
    requirementsDescription: rank8RequirementsDescription,
    meta: rank8Meta,
  },
  {
    rank: 9,
    label: 'IX',
    name: 'Grand Master',
    time: '>19 y',
    color: 'bg-pink-300',
    description: rank9Description,
    requirementsDescription: rank9RequirementsDescription,
    meta: rank9Meta,
  },
];

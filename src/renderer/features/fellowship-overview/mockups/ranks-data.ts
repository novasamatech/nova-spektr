export type RankData = {
  id: string;
  name: string;
  time: string;
  color: string;
  title: string;
  analogue: string;
  material: string;
  description: string;
  activity: string;
  agreement: string;
  timeRequired: string;
  requirements: string[];
};

export const RANKS_DATA: Record<string, RankData> = {
  I: {
    id: 'I',
    name: 'Humble',
    time: 'n/a',
    color: '#bbbbbb',
    title: 'I Humble',
    analogue: 'Undergraduate Student',
    material: 'Talc (1 Moh)',
    description:
      'This is the starting rank for all fellowship members. At this level, members are expected to be learning the basics of the protocol and contributing in small ways. They are encouraged to participate in discussions and begin building their understanding of the ecosystem.',
    activity: '10%',
    agreement: '50%',
    timeRequired: 'Initial',
    requirements: [
      'Express interest in joining the fellowship',
      'Demonstrate basic understanding of Polkadot',
      'Participate in community discussions',
    ],
  },
  II: {
    id: 'II',
    name: 'Proficient',
    time: '~1 y',
    color: '#ffad4f',
    title: 'II Proficient',
    analogue: 'Graduate Student',
    material: 'Gypsum (2 Moh)',
    description:
      'At this level, members have demonstrated consistent participation and a solid understanding of the protocol. They are expected to contribute more substantially to discussions and may begin taking on small projects or tasks within the fellowship.',
    activity: '20%',
    agreement: '55%',
    timeRequired: '~1 year',
    requirements: [
      'Consistent participation in fellowship activities',
      'Demonstrate growing technical knowledge',
      'Contribute to at least one minor project or initiative',
    ],
  },
  III: {
    id: 'III',
    name: 'Fellow',
    time: '~2 y',
    color: '#ffa5a2',
    title: 'III Fellow',
    analogue: 'PhD Candidate',
    material: 'Calcite (3 Moh)',
    description:
      'Fellows have established themselves as reliable contributors to the protocol. They have demonstrated technical competence and the ability to work independently on meaningful projects. At this level, members are expected to mentor newer members and take on more significant responsibilities.',
    activity: '25%',
    agreement: '60%',
    timeRequired: '~2 years',
    requirements: [
      'Complete at least one significant technical contribution',
      'Mentor newer fellowship members',
      'Demonstrate expertise in specific areas of the protocol',
      'Publish articles or documentation about the protocol',
    ],
  },
  IV: {
    id: 'IV',
    name: 'Architect',
    time: '>3 y',
    color: '#d7abfe',
    title: 'IV Architect',
    analogue: 'Postdoctoral Researcher',
    material: 'Fluorite (4 Moh)',
    description:
      'Architects have proven their ability to design and implement major components of the protocol. They are recognized experts in their areas of focus and are trusted to make important technical decisions. Architects are expected to lead projects and guide the technical direction of significant initiatives.',
    activity: '30%',
    agreement: '65%',
    timeRequired: '>3 years',
    requirements: [
      'Lead the design of a major protocol component',
      'Demonstrate deep technical expertise across multiple areas',
      'Contribute to strategic technical planning',
      'Mentor Fellows and help them advance their skills',
    ],
  },
  V: {
    id: 'V',
    name: 'Architect Adept',
    time: '>4 y',
    color: '#69d8ff',
    title: 'V Architect Adept',
    analogue: 'Assistant Professor',
    material: 'Apatite (5 Moh)',
    description:
      'Architect Adepts have mastered the technical aspects of the protocol and have a proven track record of successful major projects. They are recognized as authorities in their fields and play a key role in shaping the future of the protocol. At this level, members are expected to drive innovation and guide the fellowship in new directions.',
    activity: '35%',
    agreement: '68%',
    timeRequired: '>4 years',
    requirements: [
      'Successfully lead multiple major protocol innovations',
      'Demonstrate consistent technical excellence over time',
      'Contribute to the broader blockchain ecosystem',
      'At least two published research papers or major technical documents',
    ],
  },
  VI: {
    id: 'VI',
    name: 'Grand Architect',
    time: '>5 y',
    color: '#6de69f',
    title: 'VI Grand Architect',
    analogue: 'Associate Professor',
    material: 'Magnetite (5.5-6 Moh)',
    description:
      'This grade is the highest rank to be arrived at through purely technical prowess and to attain it, the individual must demonstrate they can match or better others of this rank in their absolute technical ability. As a benchmark, they must have played an advisory role in the architecture, design and implementation of at least five major protocol components and actively designed and built at least two from start to finish. They must have demonstrated beyond doubt the ability to nurture into greatness not only new Fellows but also new Architects.\n\nThis is the first rank for which pre-specified discussion points become a crucial part of the grading and where those voting on the promotion must make a qualitative assessment on the outcome of the discussion in comparison to the precedent of prior promotions.',
    activity: '40%',
    agreement: '70%',
    timeRequired: '>5 years',
    requirements: [
      'Devised, lead the design and overseen (or lead) the implementation of a major protocol innovation.',
      'At least three published long-form articles about technology relevant to but not specifically concerning Polkadot.',
      'Discuss: What have you learnt from this individual which you might ultimately find useful in your efforts to help Polkadot succeed?',
    ],
  },
  VII: {
    id: 'VII',
    name: 'Free Master',
    time: '>6 y',
    color: '#B3B3FF',
    title: 'VII Free Master',
    analogue: 'Full Professor',
    material: 'Quartz (7 Moh)',
    description:
      'Free Masters have transcended purely technical contributions and have demonstrated leadership at the highest levels of the fellowship and the broader ecosystem. They are recognized as thought leaders and have made lasting impacts on the protocol. At this level, members focus on strategic vision and long-term planning.',
    activity: '45%',
    agreement: '75%',
    timeRequired: '>6 years',
    requirements: [
      'Demonstrate sustained excellence over many years',
      'Lead strategic initiatives that shape the future of the protocol',
      'Significant contributions to the broader blockchain community',
      'Evidence of thought leadership through publications, talks, or other venues',
    ],
  },
  VIII: {
    id: 'VIII',
    name: 'Master Constant',
    time: '>11 y',
    color: '#51EBDE',
    title: 'VIII Master Constant',
    analogue: 'Distinguished Professor',
    material: 'Topaz (8 Moh)',
    description:
      'Master Constants are legendary figures within the fellowship who have dedicated more than a decade to advancing the protocol. They have made contributions that will be remembered for generations and have shaped the direction of the entire ecosystem. At this level, members serve as advisors and statesmen for the fellowship.',
    activity: '50%',
    agreement: '80%',
    timeRequired: '>11 years',
    requirements: [
      'Over a decade of consistent, exceptional contributions',
      'Recognized as a pioneer in the field',
      'Mentored multiple members to senior ranks',
      'Legacy contributions that have fundamentally shaped the protocol',
    ],
  },
  IX: {
    id: 'IX',
    name: 'Grand Master',
    time: '>19 y',
    color: '#FF98BC',
    title: 'IX Grand Master',
    analogue: 'Emeritus Professor',
    material: 'Corundum (9 Moh)',
    description:
      'Grand Masters represent the highest level of achievement within the fellowship. These individuals have dedicated nearly two decades or more to the protocol and have made contributions of immeasurable value. They are the wise elders of the fellowship, providing guidance and wisdom accumulated over years of experience.',
    activity: '55%',
    agreement: '85%',
    timeRequired: '>19 years',
    requirements: [
      'Nearly two decades or more of exceptional service',
      'Recognized as one of the founding figures of the ecosystem',
      'Profound and lasting impact on the protocol and community',
      'Wisdom and guidance that shapes the fellowship itself',
    ],
  },
};

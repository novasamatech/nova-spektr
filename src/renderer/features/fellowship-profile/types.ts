type BaseAlert = {
  id: string;
  seen: boolean;
};
type ProvenAlert = BaseAlert & {
  type: 'proven';
  rank: number;
  referendumId: number;
};
type PromotedAlert = BaseAlert & {
  type: 'promoted';
  rank: number;
  referendumId: number;
};
type RetentionFailedAlert = BaseAlert & {
  type: 'retentionFailed';
  rank: number;
  referendumId: number;
};
type PromotionFailedAlert = BaseAlert & {
  type: 'promotionFailed';
  rank: number;
  referendumId: number;
};
type BumpedAlert = BaseAlert & {
  type: 'bumped';
  rank: number;
};
type RetentionRequestWhenPromotionReferendumExistsAlert = BaseAlert & {
  type: 'retentionRequestWhenPromotionReferendumExists';
};
type PromotionRequestWhenRetentionReferendumExistsAlert = BaseAlert & {
  type: 'promotionRequestWhenRetentionReferendumExists';
};

export type Alert =
  | ProvenAlert
  | PromotedAlert
  | RetentionFailedAlert
  | PromotionFailedAlert
  | RetentionRequestWhenPromotionReferendumExistsAlert
  | PromotionRequestWhenRetentionReferendumExistsAlert
  | BumpedAlert;

/**
 * A KPI card is one figure with a subline — extra height would only add blank
 * card, so growth is capped at double width and the default height. Shared with
 * the network-level card in `dashboard-staking-min-stake`, so the row stays one
 * row.
 */
export const KPI_SIZE = { defaultSize: { w: 1, h: 2 }, minSize: { w: 1, h: 2 }, maxSize: { w: 2, h: 2 } };

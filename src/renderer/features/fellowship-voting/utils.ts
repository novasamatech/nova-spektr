export function categorizeImpact(voteImpact: number): string {
  if (voteImpact >= 60) {
    return 'huge';
  } else if (voteImpact <= 20) {
    return 'minor';
  }
  return 'moderate';
}

export type ActivityType = 'snorkeling' | 'kayaking' | 'sup' | 'fishing';

export type ActivityStatus = 'good' | 'caution' | 'bad';

export interface ActivityRecommendation {
  status: ActivityStatus;
  reason: string; // Human-readable explanation
  window?: string; // Optional time window (e.g., "Next 4-6 hours")
}


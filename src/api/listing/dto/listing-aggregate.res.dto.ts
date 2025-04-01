export class ListingAggregateResDto {
  status_counts: StatusCountDto[];
  availability_counts: AvailabilityCountDto[];
  total_listings: number;
}

export class StatusCountDto {
  status: string;
  count: number;
}

export class AvailabilityCountDto {
  availability: string;
  count: number;
}

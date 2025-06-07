// Helper function to check if a timestamp is within a given date range

type isWithinTimeRangeProps = {
  timestamp: number;
  filter: string;
};

export default function isWithinTimeRange ({timestamp, filter}: isWithinTimeRangeProps): boolean {
  const fileDate = new Date(timestamp * 1000); // Convert Unix timestamp to Date object
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Normalize 'now' to start of today

  switch (filter) {
    case "today":
      return fileDate.toDateString() === now.toDateString();
    case "last7days":
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return fileDate >= sevenDaysAgo && fileDate <= new Date();
    case "last30days":
      const thirtyDaysAgo = new Date(
        now.getTime() - 30 * 24 * 60 * 60 * 1000
      );
      return fileDate >= thirtyDaysAgo && fileDate <= new Date();
    case "all":
    default:
      return true;
  }
};
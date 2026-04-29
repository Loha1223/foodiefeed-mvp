const MS_PER_DAY = 1000 * 60 * 60 * 24;
const ENDING_SOON_DAYS = 2;

function getExpiryTime(expiry: string): number {
  return new Date(expiry).getTime();
}

export function getRemainingDays(expiry: string): number {
  const expiryTime = getExpiryTime(expiry);

  if (Number.isNaN(expiryTime)) {
    return 0;
  }

  const diff = expiryTime - Date.now();

  if (diff <= 0) {
    return 0;
  }

  return Math.ceil(diff / MS_PER_DAY);
}

export function isExpired(expiry: string): boolean {
  const expiryTime = getExpiryTime(expiry);

  if (Number.isNaN(expiryTime)) {
    return true;
  }

  return expiryTime <= Date.now();
}

export function getExpiryLabel(expiry: string): string {
  if (isExpired(expiry)) {
    return "已失效";
  }

  const days = getRemainingDays(expiry);
  return `倒數 ${days} 天`;
}

export function getExpiryTone(
  expiry: string,
): "active" | "ending_soon" | "expired" {
  if (isExpired(expiry)) {
    return "expired";
  }

  const days = getRemainingDays(expiry);
  if (days <= ENDING_SOON_DAYS) {
    return "ending_soon";
  }

  return "active";
}

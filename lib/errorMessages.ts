export type AppErrorCategory =
  | "unauthenticated"
  | "unauthorized"
  | "network"
  | "supabase"
  | "image_validation"
  | "generic";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "";
}

export function classifyAppError(error: unknown): AppErrorCategory {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("請先登入") ||
    message.includes("not authenticated") ||
    message.includes("auth session missing")
  ) {
    return "unauthenticated";
  }

  if (
    message.includes("permission") ||
    message.includes("not allowed") ||
    message.includes("forbidden") ||
    message.includes("row-level security") ||
    message.includes("rls") ||
    message.includes("policy")
  ) {
    return "unauthorized";
  }

  if (
    message.includes("network") ||
    message.includes("failed to fetch") ||
    message.includes("fetch")
  ) {
    return "network";
  }

  if (
    message.includes("supabase") ||
    message.includes("jwt") ||
    message.includes("session") ||
    message.includes("postgres") ||
    message.includes("database") ||
    message.includes("invalid api key")
  ) {
    return "supabase";
  }

  if (
    message.includes("圖片格式") ||
    message.includes("圖片大小") ||
    message.includes("jpg") ||
    message.includes("png") ||
    message.includes("webp") ||
    message.includes("5mb")
  ) {
    return "image_validation";
  }

  return "generic";
}

export function getUserFriendlyErrorMessage(
  error: unknown,
  fallback: string,
): string {
  const category = classifyAppError(error);

  switch (category) {
    case "unauthenticated":
      return "請先登入後再操作。";
    case "unauthorized":
      return "你沒有執行此操作的權限。";
    case "network":
      return "網路連線異常，請稍後再試。";
    case "supabase":
      return "系統服務暫時異常，請稍後再試。";
    case "image_validation":
      return "圖片格式或大小不符合限制（JPG/PNG/WebP，5MB 內）。";
    default:
      return fallback;
  }
}

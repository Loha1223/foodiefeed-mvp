import { getSupabaseClient } from "@/lib/supabaseClient";

export type UserRole = "user" | "admin";

type ProfileRoleRow = {
  role: string | null;
};

export async function getCurrentUserRole(userId: string): Promise<UserRole> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return "user";
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn(`Failed to fetch current user role: ${error.message}`);
    return "user";
  }

  const role = (data as ProfileRoleRow | null)?.role;
  return role === "admin" ? "admin" : "user";
}

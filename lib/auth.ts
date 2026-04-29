import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabaseClient";

const SUPABASE_NOT_CONFIGURED_MESSAGE = "Supabase env is not configured";

export type AuthSubscription = {
  unsubscribe: () => void;
};

export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();

  if (error) {
    const message = error.message.toLowerCase();

    if (message.includes("session") || message.includes("jwt")) {
      return null;
    }

    throw new Error(error.message);
  }

  return data.user;
}

export async function signInWithEmail(email: string): Promise<void> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error(SUPABASE_NOT_CONFIGURED_MESSAGE);
  }

  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    throw new Error("請輸入 Email");
  }

  const emailRedirectTo =
    typeof window !== "undefined" ? window.location.origin : undefined;

  const { error } = await supabase.auth.signInWithOtp({
    email: trimmedEmail,
    options: emailRedirectTo ? { emailRedirectTo } : undefined,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error(SUPABASE_NOT_CONFIGURED_MESSAGE);
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

export function onAuthStateChange(
  callback: (user: User | null) => void,
): AuthSubscription {
  const supabase = getSupabaseClient();

  if (!supabase) {
    callback(null);
    return { unsubscribe: () => undefined };
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });

  return {
    unsubscribe: () => data.subscription.unsubscribe(),
  };
}

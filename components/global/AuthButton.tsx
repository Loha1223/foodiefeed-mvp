"use client";

import { useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { signInWithEmail, signOut } from "@/lib/auth";
import { useToast } from "@/hooks/useToast";
import { getUserFriendlyErrorMessage } from "@/lib/errorMessages";

type AuthButtonProps = {
  user: User | null;
  isLoading: boolean;
};

export function AuthButton({ user, isLoading }: AuthButtonProps) {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim()) {
      setErrorMessage("請輸入 Email");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await signInWithEmail(email);
      showToast({
        variant: "success",
        title: "已寄送登入連結",
        message: "請到信箱點擊 magic link 完成登入。",
      });
    } catch (error) {
      showToast({
        variant: "error",
        title: "登入失敗",
        message: getUserFriendlyErrorMessage(error, "登入連結寄送失敗，請稍後再試。"),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await signOut();
      setEmail("");
      showToast({
        variant: "success",
        title: "已登出",
        message: "你已成功登出。",
      });
    } catch (error) {
      showToast({
        variant: "error",
        title: "登出失敗",
        message: getUserFriendlyErrorMessage(error, "登出失敗，請稍後再試。"),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (user) {
    return (
      <div className="flex flex-col gap-1 text-sm sm:items-end">
        <div className="flex flex-wrap items-center gap-2">
          <span className="max-w-48 truncate text-stone-600">
            {user.email}
          </span>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSubmitting}
            className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:text-stone-400"
          >
            登出
          </button>
        </div>
        {errorMessage ? (
          <p className="max-w-64 text-xs text-red-600">{errorMessage}</p>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={handleSignIn} className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (errorMessage) {
              setErrorMessage("");
            }
          }}
          className="w-44 rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-red-500"
          placeholder="email@example.com"
        />
        <button
          type="submit"
          disabled={isLoading || isSubmitting}
          className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:text-stone-400"
        >
          {isLoading || isSubmitting ? "處理中" : "寄送登入連結"}
        </button>
      </div>
      {errorMessage ? (
        <p className="max-w-72 text-xs text-red-600">{errorMessage}</p>
      ) : null}
    </form>
  );
}

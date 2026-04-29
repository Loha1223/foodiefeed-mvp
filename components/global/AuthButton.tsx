"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import {
  getCurrentUser,
  onAuthStateChange,
  signInWithEmail,
  signOut,
} from "@/lib/auth";

export function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      try {
        const currentUser = await getCurrentUser();

        if (isMounted) {
          setUser(currentUser);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : "無法取得登入狀態",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    const subscription = onAuthStateChange((nextUser) => {
      setUser(nextUser);
      setIsLoading(false);
    });

    void loadUser();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim()) {
      setErrorMessage("請輸入 Email");
      return;
    }

    setErrorMessage("");
    setMessage("");
    setIsLoading(true);

    try {
      await signInWithEmail(email);
      setMessage("已寄出登入連結，請檢查信箱");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "登入連結寄送失敗",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignOut() {
    setErrorMessage("");
    setMessage("");
    setIsLoading(true);

    try {
      await signOut();
      setUser(null);
      setEmail("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "登出失敗");
    } finally {
      setIsLoading(false);
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
            disabled={isLoading}
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
          disabled={isLoading}
          className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:text-stone-400"
        >
          {isLoading ? "處理中" : "寄送登入連結"}
        </button>
      </div>
      {message ? <p className="max-w-72 text-xs text-green-700">{message}</p> : null}
      {errorMessage ? (
        <p className="max-w-72 text-xs text-red-600">{errorMessage}</p>
      ) : null}
    </form>
  );
}

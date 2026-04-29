"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getCurrentUser, onAuthStateChange } from "@/lib/auth";
import { getCurrentUserRole, type UserRole } from "@/lib/profiles";

export function useCurrentUser() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>("user");
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function setUserAndRole(user: User | null) {
      if (!isMounted) {
        return;
      }

      setCurrentUser(user);

      if (!user) {
        setCurrentRole("user");
        return;
      }

      const role = await getCurrentUserRole(user.id);

      if (isMounted) {
        setCurrentRole(role);
      }
    }

    async function loadUser() {
      try {
        const user = await getCurrentUser();
        await setUserAndRole(user);
      } catch (error) {
        if (isMounted) {
          setAuthError(
            error instanceof Error ? error.message : "無法取得登入狀態",
          );
        }
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    }

    const subscription = onAuthStateChange((user) => {
      setAuthError("");
      setIsAuthLoading(true);
      void setUserAndRole(user).finally(() => {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      });
    });

    void loadUser();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    currentUser,
    currentRole,
    isAdmin: currentRole === "admin",
    isAuthLoading,
    authError,
  };
}

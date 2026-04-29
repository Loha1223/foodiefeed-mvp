"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AuthButton } from "@/components/global/AuthButton";

type NavbarProps = {
  isMyPostsOpen: boolean;
  isAdminPanelOpen: boolean;
  currentUser: User | null;
  isAdmin: boolean;
  isAuthLoading: boolean;
  onToggleMyPosts: () => void;
  onToggleAdminPanel: () => void;
  onOpenPostModal: () => void;
};

export function Navbar({
  isMyPostsOpen,
  isAdminPanelOpen,
  currentUser,
  isAdmin,
  isAuthLoading,
  onToggleMyPosts,
  onToggleAdminPanel,
  onOpenPostModal,
}: NavbarProps) {
  const [isMobileActionsOpen, setIsMobileActionsOpen] = useState(false);

  function handleToggleMyPosts() {
    onToggleMyPosts();
    setIsMobileActionsOpen(false);
  }

  function handleToggleAdminPanel() {
    onToggleAdminPanel();
    setIsMobileActionsOpen(false);
  }

  function handleOpenPostModal() {
    onOpenPostModal();
    setIsMobileActionsOpen(false);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-normal text-stone-950">
            味鮮牆 FoodieFeed
          </h1>
          <p className="mt-1 text-sm text-stone-500">限時美食情報站</p>
        </div>

        <div className="flex items-center justify-end gap-2 sm:hidden">
          <button
            type="button"
            onClick={handleOpenPostModal}
            className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            發佈情報
          </button>
          <button
            type="button"
            onClick={() => setIsMobileActionsOpen((isOpen) => !isOpen)}
            className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:bg-stone-50"
          >
            {isMobileActionsOpen ? "收合選單" : "更多操作"}
          </button>
        </div>

        <div
          className={`${isMobileActionsOpen ? "flex" : "hidden"} flex-col gap-3 sm:flex sm:flex-row sm:flex-wrap sm:items-center`}
        >
          <AuthButton user={currentUser} isLoading={isAuthLoading} />
          <button
            type="button"
            onClick={handleToggleMyPosts}
            className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:bg-stone-50"
          >
            {isMyPostsOpen ? "關閉投稿" : "我的投稿"}
          </button>
          {isAdmin ? (
            <button
              type="button"
              onClick={handleToggleAdminPanel}
              className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:bg-stone-50"
            >
              {isAdminPanelOpen ? "關閉管理" : "Admin 管理"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleOpenPostModal}
            className="hidden rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 sm:inline-flex"
          >
            發佈情報
          </button>
        </div>
      </div>
    </header>
  );
}

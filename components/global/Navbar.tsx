"use client";

import { AuthButton } from "@/components/global/AuthButton";

type NavbarProps = {
  isAdminOpen: boolean;
  onToggleAdmin: () => void;
  onOpenPostModal: () => void;
};

export function Navbar({
  isAdminOpen,
  onToggleAdmin,
  onOpenPostModal,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-normal text-stone-950">
            味鮮牆 FoodieFeed
          </h1>
          <p className="mt-1 text-sm text-stone-500">限時美食情報站</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <AuthButton />
          <button
            type="button"
            onClick={onToggleAdmin}
            className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:bg-stone-50"
          >
            {isAdminOpen ? "關閉後台" : "管理後台"}
          </button>
          <button
            type="button"
            onClick={onOpenPostModal}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            發佈情報
          </button>
        </div>
      </div>
    </header>
  );
}

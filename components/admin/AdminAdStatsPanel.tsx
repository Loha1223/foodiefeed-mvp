"use client";

import { useEffect, useState } from "react";
import { fetchSponsoredAdStats } from "@/lib/ads";
import type { SponsoredAdStats } from "@/types/foodie";

type AdminAdStatsPanelProps = {
  isAdmin: boolean;
  isOpen: boolean;
  onClose?: () => void;
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "未設定";
  }

  return new Date(value).toLocaleString("zh-TW");
}

function getAdStatusLabel(stat: SponsoredAdStats) {
  const now = Date.now();
  const startsAt = stat.starts_at ? new Date(stat.starts_at).getTime() : null;
  const endsAt = new Date(stat.ends_at).getTime();

  if (!stat.is_active) {
    return "停用";
  }

  if (startsAt !== null && now < startsAt) {
    return "尚未開始";
  }

  if (now > endsAt) {
    return "已結束";
  }

  return "投放中";
}

function getAdStatusClass(status: string) {
  if (status === "投放中") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "尚未開始") {
    return "bg-sky-50 text-sky-700";
  }

  return "bg-stone-100 text-stone-600";
}

export function AdminAdStatsPanel({
  isAdmin,
  isOpen,
  onClose,
}: AdminAdStatsPanelProps) {
  const [stats, setStats] = useState<SponsoredAdStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadStats() {
    if (!isAdmin || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fetchedStats = await fetchSponsoredAdStats();
      setStats(fetchedStats);
    } catch (loadError) {
      console.warn(
        loadError instanceof Error
          ? loadError.message
          : "Failed to fetch sponsored ad stats",
      );
      setError(
        loadError instanceof Error
          ? loadError.message
          : "目前無法載入廣告成效資料",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen && isAdmin) {
      void loadStats();
    }
  }, [isOpen, isAdmin]);

  if (!isOpen) {
    return null;
  }

  return (
    <section className="border-b border-stone-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-stone-950">廣告成效</h2>
            <p className="mt-1 text-sm text-stone-500">
              Sponsored Posts 的曝光、點擊與 CTR 摘要。
            </p>
          </div>
          <div className="flex gap-2">
            {isAdmin ? (
              <button
                type="button"
                onClick={() => void loadStats()}
                disabled={isLoading}
                className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:text-stone-400"
              >
                重新整理
              </button>
            ) : null}
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                關閉
              </button>
            ) : null}
          </div>
        </div>

        {!isAdmin ? (
          <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
            你沒有管理員權限
          </div>
        ) : null}

        {isAdmin && isLoading ? (
          <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
            廣告成效載入中...
          </div>
        ) : null}

        {isAdmin && !isLoading && error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void loadStats()}
              className="mt-4 rounded-md border border-red-200 px-3 py-2 font-medium hover:bg-white"
            >
              重新整理
            </button>
          </div>
        ) : null}

        {isAdmin && !isLoading && !error && stats.length === 0 ? (
          <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
            目前沒有廣告資料
          </div>
        ) : null}

        {isAdmin && !isLoading && !error && stats.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-200 text-sm">
                <thead className="bg-stone-50 text-left text-xs font-semibold uppercase tracking-normal text-stone-500">
                  <tr>
                    <th className="px-4 py-3">廣告</th>
                    <th className="px-4 py-3">版位</th>
                    <th className="px-4 py-3">狀態</th>
                    <th className="px-4 py-3">投放期間</th>
                    <th className="px-4 py-3 text-right">曝光</th>
                    <th className="px-4 py-3 text-right">點擊</th>
                    <th className="px-4 py-3 text-right">CTR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {stats.map((stat) => {
                    const status = getAdStatusLabel(stat);

                    return (
                      <tr key={stat.id} className="align-top">
                        <td className="px-4 py-4">
                          <p className="text-xs text-stone-500">ID {stat.id}</p>
                          <p className="mt-1 font-semibold text-stone-950">
                            {stat.brand_name}
                          </p>
                          <p className="mt-1 text-stone-600">{stat.title}</p>
                        </td>
                        <td className="px-4 py-4 text-stone-600">
                          {stat.placement ?? "未設定"}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getAdStatusClass(status)}`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-stone-600">
                          <p>{formatDateTime(stat.starts_at)}</p>
                          <p className="mt-1">{formatDateTime(stat.ends_at)}</p>
                        </td>
                        <td className="px-4 py-4 text-right tabular-nums text-stone-700">
                          {stat.impressions}
                        </td>
                        <td className="px-4 py-4 text-right tabular-nums text-stone-700">
                          {stat.clicks}
                        </td>
                        <td className="px-4 py-4 text-right tabular-nums font-semibold text-stone-950">
                          {stat.ctr_percent.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

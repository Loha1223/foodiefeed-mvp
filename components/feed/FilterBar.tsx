"use client";

import { useMemo, useState } from "react";
import { taiwanDistricts } from "@/data/taiwanDistricts";
import type { FeedFilterState, FeedSortOption } from "@/types/foodie";

type FilterBarProps = {
  filter: FeedFilterState;
  isLoading?: boolean;
  totalCount: number;
  filteredCount: number;
  onKeywordChange: (value: string) => void;
  onCategoryChange: (value: FeedFilterState["category"]) => void;
  onCityChange: (value: string) => void;
  onDistrictChange: (value: string) => void;
  onSortChange: (value: FeedSortOption) => void;
  onReset: () => void;
};

const categoryOptions: Array<{ value: FeedFilterState["category"]; label: string }> = [
  { value: "all", label: "全部類別" },
  { value: "快閃店", label: "快閃店" },
  { value: "當日限定", label: "當日限定" },
  { value: "期間限定優惠", label: "期間限定優惠" },
  { value: "在地美食", label: "在地美食" },
  { value: "新品上市", label: "新品上市" },
  { value: "other", label: "其他" },
];

const sortOptions: Array<{ value: FeedSortOption; label: string }> = [
  { value: "latest", label: "最新發布" },
  { value: "expiry_soon", label: "即將到期" },
  { value: "popular", label: "最多按讚" },
  { value: "comments", label: "最多留言" },
];

const cityOptions = Object.keys(taiwanDistricts);

export function FilterBar({
  filter,
  isLoading = false,
  totalCount,
  filteredCount,
  onKeywordChange,
  onCategoryChange,
  onCityChange,
  onDistrictChange,
  onSortChange,
  onReset,
}: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const districtOptions = filter.city
    ? (taiwanDistricts[filter.city as keyof typeof taiwanDistricts] ?? [])
    : [];
  const activeSummary = useMemo(() => {
    const conditionParts: string[] = [];

    if (filter.keyword.trim()) {
      conditionParts.push(`關鍵字：${filter.keyword.trim()}`);
    }
    if (filter.category !== "all") {
      const categoryLabel =
        categoryOptions.find((option) => option.value === filter.category)?.label ??
        filter.category;
      conditionParts.push(`類別：${categoryLabel}`);
    }
    if (filter.city) {
      conditionParts.push(`縣市：${filter.city}`);
    }
    if (filter.district) {
      conditionParts.push(`行政區：${filter.district}`);
    }
    const sortLabel =
      sortOptions.find((option) => option.value === filter.sortBy)?.label ?? "最新發布";

    return {
      conditionParts,
      sortLabel,
    };
  }, [filter]);

  return (
    <section className="mx-auto max-w-6xl px-4 pt-2 sm:px-6 sm:pt-3">
      <div className="space-y-2 rounded-md border border-stone-200/90 bg-stone-50/60 p-2 sm:p-2.5">
        <div>
          <p className="text-[11px] font-medium text-stone-500 sm:text-xs">
            即時情報探索
          </p>
          <p className="mt-0.5 text-sm font-medium text-stone-800 sm:text-[15px]">
            共 {totalCount} 筆 · 篩選後 {filteredCount} 筆
          </p>
          {isLoading ? (
            <p className="mt-0.5 text-[11px] text-stone-500 sm:text-xs">
              情報載入中，請稍候...
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] text-stone-500 sm:text-xs">
              先看最新情報，再依需求展開進階篩選。
            </p>
          )}
        </div>

        <div className="flex flex-nowrap items-end gap-2">
          <input
            type="text"
            value={filter.keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            disabled={isLoading}
            placeholder="關鍵字：標題、店名、地址…"
            aria-label="關鍵字搜尋"
            className="min-w-0 flex-1 rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-red-500 disabled:cursor-not-allowed disabled:bg-stone-100 sm:px-3 sm:py-2"
          />
          <button
            type="button"
            onClick={() => setIsExpanded((expanded) => !expanded)}
            className="shrink-0 rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 sm:px-3 sm:py-2 sm:text-sm"
          >
            {isExpanded ? "收合" : "進階"}
          </button>
        </div>

        <div className="rounded border border-stone-200/80 bg-white/70 px-2 py-1.5 text-[10px] leading-relaxed text-stone-500 sm:text-[11px]">
          {activeSummary.conditionParts.length > 0 ? (
            <p className="flex flex-wrap gap-x-2 gap-y-0.5">
              {activeSummary.conditionParts.map((summary) => (
                <span key={summary}>{summary}</span>
              ))}
              <span>排序：{activeSummary.sortLabel}</span>
            </p>
          ) : (
            <p>目前：未套用篩選（排序：{activeSummary.sortLabel}）</p>
          )}
        </div>

        {isExpanded ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-sm text-stone-600">
            類別
            <select
              value={filter.category}
              onChange={(event) =>
                onCategoryChange(event.target.value as FeedFilterState["category"])
              }
              disabled={isLoading}
              className="mt-1.5 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-red-500 disabled:cursor-not-allowed disabled:bg-stone-100"
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-stone-600">
            縣市
            <select
              value={filter.city}
              onChange={(event) => onCityChange(event.target.value)}
              disabled={isLoading}
              className="mt-1.5 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-red-500 disabled:cursor-not-allowed disabled:bg-stone-100"
            >
              <option value="">全部縣市</option>
              {cityOptions.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-stone-600">
            行政區
            <select
              value={filter.district}
              onChange={(event) => onDistrictChange(event.target.value)}
              disabled={isLoading || !filter.city}
              className="mt-1.5 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-red-500 disabled:cursor-not-allowed disabled:bg-stone-100"
            >
              <option value="">全部行政區</option>
              {districtOptions.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-stone-600">
            排序
            <select
              value={filter.sortBy}
              onChange={(event) => onSortChange(event.target.value as FeedSortOption)}
              disabled={isLoading}
              className="mt-1.5 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-red-500 disabled:cursor-not-allowed disabled:bg-stone-100"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={onReset}
              disabled={isLoading}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
            >
              清除篩選
            </button>
          </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

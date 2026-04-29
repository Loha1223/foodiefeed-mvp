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
    <section className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
      <div className="space-y-3 border-b border-stone-200 pb-4">
        <div>
          <p className="text-sm font-medium text-stone-500">即時情報</p>
          <p className="mt-1 text-lg font-semibold text-stone-900">
            共 {totalCount} 筆，篩選後 {filteredCount} 筆
          </p>
          {isLoading ? (
            <p className="mt-1 text-xs text-stone-500">情報載入中，請稍候...</p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block text-sm text-stone-600">
            關鍵字搜尋
            <input
              type="text"
              value={filter.keyword}
              onChange={(event) => onKeywordChange(event.target.value)}
              disabled={isLoading}
              placeholder="搜尋標題、店名、地址、地區"
              className="mt-1.5 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-red-500 disabled:cursor-not-allowed disabled:bg-stone-100"
            />
          </label>
          <button
            type="button"
            onClick={() => setIsExpanded((expanded) => !expanded)}
            className="h-fit rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            {isExpanded ? "收合進階篩選" : "展開進階篩選"}
          </button>
        </div>

        <div className="rounded-md bg-stone-50 px-3 py-2 text-xs text-stone-600">
          {activeSummary.conditionParts.length > 0 ? (
            <p className="flex flex-wrap gap-x-3 gap-y-1">
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

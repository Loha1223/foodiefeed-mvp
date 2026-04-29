"use client";

import { taiwanDistricts } from "@/data/taiwanDistricts";
import type { FeedFilterState, FeedSortOption } from "@/types/foodie";

type FilterBarProps = {
  filter: FeedFilterState;
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
  totalCount,
  filteredCount,
  onKeywordChange,
  onCategoryChange,
  onCityChange,
  onDistrictChange,
  onSortChange,
  onReset,
}: FilterBarProps) {
  const districtOptions = filter.city
    ? (taiwanDistricts[filter.city as keyof typeof taiwanDistricts] ?? [])
    : [];

  return (
    <section className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
      <div className="space-y-4 border-b border-stone-200 pb-4">
        <div>
          <p className="text-sm font-medium text-stone-500">即時情報</p>
          <p className="mt-1 text-lg font-semibold text-stone-900">
            共 {totalCount} 筆，篩選後 {filteredCount} 筆
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-sm text-stone-600 sm:col-span-2 lg:col-span-3">
            關鍵字搜尋
            <input
              type="text"
              value={filter.keyword}
              onChange={(event) => onKeywordChange(event.target.value)}
              placeholder="搜尋標題、店名、地址、地區"
              className="mt-1.5 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-red-500"
            />
          </label>

          <label className="block text-sm text-stone-600">
            類別
            <select
              value={filter.category}
              onChange={(event) =>
                onCategoryChange(event.target.value as FeedFilterState["category"])
              }
              className="mt-1.5 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-red-500"
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
              className="mt-1.5 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-red-500"
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
              disabled={!filter.city}
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
              className="mt-1.5 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-red-500"
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
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              清除篩選
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

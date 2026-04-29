"use client";

type FilterBarProps = {
  totalCount: number;
};

export function FilterBar({ totalCount }: FilterBarProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
      <div className="flex flex-col gap-3 border-b border-stone-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-stone-500">即時情報</p>
          <p className="mt-1 text-lg font-semibold text-stone-900">
            目前共有 {totalCount} 筆限時美食
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-stone-500">
          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-stone-200">
            瀑布流
          </span>
          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-stone-200">
            倒數優先
          </span>
        </div>
      </div>
    </section>
  );
}

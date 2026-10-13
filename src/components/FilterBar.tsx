import type { RefObject } from "react";
import { isFilterActive, type CardFilter } from "../lib/filters";
import { PRIORITIES, type Label, type Priority } from "../lib/types";
import { PRIORITY_LABEL } from "./CardFace";

interface Props {
  filter: CardFilter;
  labels: Label[];
  matchCount: number;
  totalCount: number;
  searchRef: RefObject<HTMLInputElement | null>;
  onChange: (f: CardFilter) => void;
  onManageLabels: () => void;
}

/** Search plus toggle chips. Filters only change what is shown, never the board itself. */
export function FilterBar({ filter, labels, matchCount, totalCount, searchRef, onChange, onManageLabels }: Props) {
  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  const active = isFilterActive(filter);

  return (
    <div className="filters" role="search" aria-label="Filter cards">
      <div className="search">
        <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden>
          <circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <label className="sr-only" htmlFor="search">
          Search cards
        </label>
        <input
          id="search"
          ref={searchRef}
          type="search"
          placeholder="Search cards"
          value={filter.query}
          onChange={(e) => onChange({ ...filter, query: e.target.value })}
          onKeyDown={(e) => e.key === "Escape" && (e.currentTarget.blur(), onChange({ ...filter, query: "" }))}
        />
        <kbd aria-hidden>/</kbd>
      </div>

      <div className="filter-group" role="group" aria-label="Labels">
        {labels.map((l) => (
          <button
            key={l.id}
            type="button"
            className={`chip chip--${l.color} chip--toggle`}
            aria-pressed={filter.labelIds.includes(l.id)}
            onClick={() => onChange({ ...filter, labelIds: toggle(filter.labelIds, l.id) })}
          >
            {l.name}
          </button>
        ))}
        <button type="button" className="link-btn" onClick={onManageLabels}>
          Edit labels
        </button>
      </div>

      <div className="filter-group" role="group" aria-label="Priority">
        {PRIORITIES.map((p: Priority) => (
          <button
            key={p}
            type="button"
            className="toggle"
            aria-pressed={filter.priorities.includes(p)}
            onClick={() => onChange({ ...filter, priorities: toggle(filter.priorities, p) })}
          >
            {PRIORITY_LABEL[p]}
          </button>
        ))}
      </div>

      {active && (
        <div className="filter-status" role="status">
          Showing {matchCount} of {totalCount}
          <button type="button" className="link-btn" onClick={() => onChange({ query: "", labelIds: [], priorities: [] })}>
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}

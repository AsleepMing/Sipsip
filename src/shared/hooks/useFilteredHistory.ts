import { useMemo } from "react";
import type { ClipboardEntry } from "../types";
import { sortClipboardEntries } from "../lib/clipboardSort";

interface UseFilteredHistoryOptions {
  history: ClipboardEntry[];
  search: string;
  typeFilter: string | null;
  tagFilter: string | null;
}

export const useFilteredHistory = ({
  history,
  search,
  typeFilter,
  tagFilter
}: UseFilteredHistoryOptions) => {
  return useMemo(() => {
    const lowerSearch = search.trim().toLowerCase();
    const selectedTag = tagFilter?.trim().toLowerCase() || null;

    const filtered = history.filter((item) => {
      if (typeFilter && item.content_type !== typeFilter) {
        return false;
      }

      let effectiveSearch = lowerSearch;
      const isTagSearch = effectiveSearch.startsWith("tag:");
      const effectiveTag = selectedTag || (isTagSearch ? effectiveSearch.slice(4).trim() : null);
      if (isTagSearch) {
        effectiveSearch = "";
      }

      if (effectiveTag) {
        const matchesTag = selectedTag
          ? item.tags?.some((tag) => tag.toLowerCase() === effectiveTag)
          : item.tags?.some((tag) => tag.toLowerCase().includes(effectiveTag));
        if (!matchesTag) return false;
      }

      if (!effectiveSearch) return true;

      return (
        item.content?.toLowerCase().includes(effectiveSearch) ||
        item.source_app?.toLowerCase().includes(effectiveSearch) ||
        item.tags?.some((tag) => tag.toLowerCase().includes(effectiveSearch))
      );
    });

    return sortClipboardEntries(filtered);
  }, [history, search, typeFilter, tagFilter]);
};

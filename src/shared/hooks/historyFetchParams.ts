export const buildGetClipboardHistoryParams = (
  limit: number,
  offset: number,
  typeFilter: string | null
) => ({
  limit,
  offset,
  contentType: typeFilter || undefined
});


/** Hard stop so a "select all" on a huge result set can't hang the tab. */
export const FETCH_ALL_MAX_ITEMS = 5000;

/**
 * Walks a paginated list endpoint at the backend's maximum page size (100) and
 * returns every row. Used by "select all N across pages" bulk actions.
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number, limit: number) => Promise<{ items: T[]; totalPages: number }>,
  { pageSize = 100, maxItems = FETCH_ALL_MAX_ITEMS }: { pageSize?: number; maxItems?: number } = {}
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const { items, totalPages: pages } = await fetchPage(page, pageSize);
    all.push(...items);
    totalPages = pages;
    page += 1;
  } while (page <= totalPages && all.length < maxItems);

  return all.slice(0, maxItems);
}

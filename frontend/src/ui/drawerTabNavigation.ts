export function drawerTabIndexForKey(key: string, currentIndex: number, tabCount: number): number | null {
  if (!Number.isInteger(tabCount) || tabCount <= 0) return null;

  if (key === "Home") return 0;
  if (key === "End") return tabCount - 1;

  const index = Number.isInteger(currentIndex) && currentIndex >= 0 && currentIndex < tabCount
    ? currentIndex
    : 0;

  if (key === "ArrowRight") return (index + 1) % tabCount;
  if (key === "ArrowLeft") return (index + tabCount - 1) % tabCount;
  return null;
}

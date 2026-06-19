export function normalizeActorName(name?: string) {
  return (name || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z]/g, "");
}

export function inferTeamFromActorName(name?: string): string | undefined {
  const normalized = normalizeActorName(name);
  if (!normalized) return undefined;

  if (normalized.includes("gayathri") || normalized.includes("vemula")) {
    return "BDE";
  }

  if (normalized.includes("jayasri") || normalized.includes("jayasris")) {
    return "Data Analyst";
  }

  if (normalized.includes("madhumitha")) {
    return "Accounts";
  }

  if (
    normalized.includes("karunya") ||
    normalized.includes("swathi") ||
    normalized.includes("nethra")
  ) {
    return "IT";
  }

  return undefined;
}

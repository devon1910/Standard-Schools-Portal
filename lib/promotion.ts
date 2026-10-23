export type PromotionClass = { id: number; name: string };

export function normalizedClassName(name: string) {
  return name.toUpperCase().replace(/[\s._-]+/g, "");
}

function classPosition(name: string) {
  const normalized = normalizedClassName(name);
  const match = /^(NURSERY|KINDERGARTEN|KG|PRIMARY|PRY|BASIC|JSS|SSS|SS)(\d+)([A-Z]*)$/.exec(normalized);
  if (!match) return null;
  const [, stage, number, stream] = match;
  const year = Number(number);
  const maximum = stage === "BASIC" ? 9 : stage === "PRIMARY" || stage === "PRY" ? 6 : 3;
  if (year < 1 || year > maximum) return null;
  // BASIC 7–9 are the same levels as JSS 1–3.
  const offset = ["NURSERY", "KINDERGARTEN", "KG"].includes(stage) ? -3 : stage === "JSS" ? 6 : ["SSS", "SS"].includes(stage) ? 9 : 0;
  return { level: offset + year, stream };
}

export function canPromote(source: string, target: string) {
  const from = classPosition(source);
  const to = classPosition(target);
  return from !== null && to !== null && to.level > from.level;
}

export function promotionTargets(source: string, targets: PromotionClass[]) {
  return targets.filter((target) => canPromote(source, target.name)).sort((a, b) =>
    classPosition(a.name)!.level - classPosition(b.name)!.level || a.name.localeCompare(b.name));
}

export function suggestedPromotionTarget(source: string, targets: PromotionClass[]) {
  const higher = promotionTargets(source, targets);
  if (!higher.length) return undefined;
  const next = higher.filter((target) => classPosition(target.name)!.level === classPosition(higher[0].name)!.level);
  return next.find((target) => classPosition(target.name)!.stream === classPosition(source)!.stream)?.id ?? next[0]?.id;
}

export function repeatedTarget(source: string, targets: PromotionClass[]) {
  const matches = targets.filter((target) => normalizedClassName(target.name) === normalizedClassName(source));
  return matches.length === 1 ? matches[0].id : undefined;
}

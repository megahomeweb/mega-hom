// Lightweight className combiner (no extra deps). Joins truthy class values and
// flattens arrays — enough for our components without pulling in clsx/tw-merge.
export type ClassValue = string | number | null | false | undefined | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const i of inputs) {
    if (!i && i !== 0) continue;
    if (Array.isArray(i)) {
      const inner = cn(...i);
      if (inner) out.push(inner);
    } else {
      out.push(String(i));
    }
  }
  return out.join(" ");
}

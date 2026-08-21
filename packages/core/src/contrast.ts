function channel(value: number): number {
  const scaled = value / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

export function parseColor(color: string): [number, number, number] | null {
  const value = color.trim();
  const hex = value.startsWith("#") ? value.slice(1) : null;
  if (hex && (hex.length === 3 || hex.length === 6)) {
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((part) => part + part)
            .join("")
        : hex;
    const parsed = Number.parseInt(full, 16);
    if (Number.isNaN(parsed)) return null;
    return [(parsed >> 16) & 255, (parsed >> 8) & 255, parsed & 255];
  }
  const rgb = value.match(/^rgba?\(([^)]+)\)$/i);
  if (!rgb?.[1]) return null;
  const parts = rgb[1].split(",").map((part) => Number.parseFloat(part));
  if (parts.length < 3 || parts.slice(0, 3).some((part) => Number.isNaN(part))) return null;
  return [parts[0] as number, parts[1] as number, parts[2] as number];
}

export function luminance(color: string): number | null {
  const rgb = parseColor(color);
  if (!rgb) return null;
  const [r, g, b] = rgb;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number | null {
  const first = luminance(a);
  const second = luminance(b);
  if (first === null || second === null) return null;
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

export function isDark(color: string): boolean {
  const value = luminance(color);
  return value === null ? false : value < 0.45;
}

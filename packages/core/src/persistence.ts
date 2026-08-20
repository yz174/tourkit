import type { PersistedTour, StorageAdapter, TourConfig } from "./types";

export function storageKey<Ctx>(config: TourConfig<Ctx>): string {
  return `tour:${config.id}:v${config.version}`;
}

function isPersisted(value: unknown): value is PersistedTour {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    (record.outcome === "pending" ||
      record.outcome === "completed" ||
      record.outcome === "skipped") &&
    typeof record.stepId === "string" &&
    typeof record.updatedAt === "number"
  );
}

export async function readRecord<Ctx>(
  storage: StorageAdapter | undefined,
  config: TourConfig<Ctx>,
): Promise<PersistedTour | null> {
  if (!storage) return null;
  try {
    const raw = await storage.get(storageKey(config));
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return isPersisted(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeRecord<Ctx>(
  storage: StorageAdapter | undefined,
  config: TourConfig<Ctx>,
  record: PersistedTour,
): Promise<void> {
  if (!storage) return;
  try {
    await storage.set(storageKey(config), JSON.stringify(record));
  } catch {}
}

export async function clearRecord<Ctx>(
  storage: StorageAdapter | undefined,
  config: TourConfig<Ctx>,
): Promise<void> {
  if (!storage) return;
  try {
    await storage.remove(storageKey(config));
  } catch {}
}

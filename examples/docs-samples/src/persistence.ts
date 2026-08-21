import { clearRecord, readRecord, type StorageAdapter } from "@tourkit/core";
import { onboarding } from "./web";

export async function showOnce(storage: StorageAdapter, start: (id: string) => void) {
  const record = await readRecord(storage, onboarding);
  if (record?.outcome !== "completed") start("onboarding");
}

export async function replay(storage: StorageAdapter, start: (id: string) => void) {
  await clearRecord(storage, onboarding);
  start("onboarding");
}

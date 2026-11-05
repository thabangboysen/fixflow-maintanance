const HANDOFF_KEY = "fixflow:tracking-student";

export function prepareTracking(studentNumber: string | undefined, storage: Storage) {
  storage.removeItem(HANDOFF_KEY);
  const number = studentNumber?.trim();
  if (number) storage.setItem(HANDOFF_KEY, number);
}

export function consumeTracking(storage: Storage): string | null {
  const number = storage.getItem(HANDOFF_KEY);
  storage.removeItem(HANDOFF_KEY);
  return number;
}
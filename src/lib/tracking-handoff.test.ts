import { describe, expect, test } from "vitest";
import { consumeTracking, prepareTracking } from "./tracking-handoff";

function storage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

describe("student tracking entry", () => {
  test("reporting passes student 240371952 to tracking without re-entry", () => {
    const session = storage();
    prepareTracking("240371952", session);
    expect(consumeTracking(session)).toBe("240371952");
  });
  test("a later landing-page visit does not reuse the reporting handoff", () => {
    const session = storage();
    prepareTracking("240371952", session);
    consumeTracking(session);
    expect(consumeTracking(session)).toBe(null);
  });
  test("unverified My Requests entry still asks for a number", () => {
    const session = storage();
    prepareTracking(undefined, session);
    expect(consumeTracking(session)).toBe(null);
  });
});
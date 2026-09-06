import { describe, expect, it } from "vitest";
import { mulberry32, rngInt, rngShuffle } from "@/lib/game/rng";

describe("mulberry32", () => {
  it("produces the same sequence for the same seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seeds", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBeCloseTo(b(), 5);
  });

  it("stays within [0, 1)", () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("rngShuffle", () => {
  it("is deterministic for a given seed and preserves elements", () => {
    const input = [1, 2, 3, 4, 5, 6];
    const shuffledA = rngShuffle(mulberry32(99), input);
    const shuffledB = rngShuffle(mulberry32(99), input);
    expect(shuffledA).toEqual(shuffledB);
    expect([...shuffledA].sort()).toEqual([...input].sort());
  });
});

describe("rngInt", () => {
  it("respects inclusive bounds", () => {
    const rng = mulberry32(5);
    for (let i = 0; i < 500; i++) {
      const v = rngInt(rng, 3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
    }
  });
});

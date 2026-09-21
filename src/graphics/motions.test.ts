import { describe, expect, it } from 'vitest';
import { advancePhase } from './motions';

describe('playback clock', () => {
  it('preserves phase when inactive', () => {
    // Given a paused, reduced-motion or hidden animation.
    const phase = .37;
    // When time advances, then phase stays frozen.
    expect(advancePhase(phase, 1, false)).toBe(phase);
  });
  it('advances and wraps on the four-second repetition clock', () => {
    // Given a nearly completed loop.
    const phase = .99;
    // When a normal frame advances the clock.
    const next = advancePhase(phase, .08, true);
    // Then it wraps without discontinuity.
    expect(next).toBeCloseTo(.01);
  });
  it('caps a resumed frame delta to avoid jumping after suspension', () => {
    // Given an active loop resumed after a long browser suspension.
    const phase = .2;
    // When the browser supplies a large frame delta.
    const next = advancePhase(phase, 100, true);
    // Then at most .025 of the cycle advances.
    expect(next).toBeCloseTo(.225);
  });
});

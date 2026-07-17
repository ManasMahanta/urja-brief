// Shared constants for the fund comparison.
//
// This deliberately lives outside both the "use client" picker and the
// server-only lib/mf.ts:
//   - A server component importing a value from a "use client" module receives a
//     client *reference*, not the value. `slice(0, MAX)` then became
//     `slice(0, NaN)` and silently returned [], dropping every fund with no
//     error raised anywhere.
//   - Importing from lib/mf.ts would drag unstable_cache and the fetching layer
//     into the client bundle.

/** Comparing more than four funds stops being readable on a phone. */
export const MAX_COMPARE_FUNDS = 4;

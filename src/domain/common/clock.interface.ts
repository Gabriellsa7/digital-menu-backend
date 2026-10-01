/**
 * Source of "now" for the domain. Services depend on this port instead of
 * calling `new Date()` so tests can freeze time.
 */
export interface IClock {
  now(): Date;
}

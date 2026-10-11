import { SAMPLE_PORTRAIT, SAMPLE_PROFILE, SAMPLE_PROPHECY } from "../../shared/sample";
import type { Portrait, Profile, Prophecy } from "../../shared/oracle";
import { profileOf, type Page, type Reading } from "../oracle/useOracle";

/**
 * Which reading the workbench is looking at. `sample` is the bundled
 * demonstration — what the cover's direct entry and `?workbench=1` open on;
 * `reading` is whatever the seeker has actually answered.
 */
export type WorkbenchSource = "reading" | "sample";

export type WorkbenchData = {
  source: WorkbenchSource;
  /** Absent until the book has heard enough to draw it. */
  portrait?: Portrait;
  /** Absent until the portrait is accepted and the prophecy is worked out. */
  prophecy?: Prophecy;
  /** The entries known so far, which a half-finished reading still has. */
  profile: Profile;
  pages: Page[];
  /** A scripted reading from the server, with no model behind it. */
  scripted: boolean;
};

/**
 * The reading the book is holding, whether it is open or shut on it. Closing
 * the book moves the reading into `bookmark`, so a workbench opened from the
 * cover would otherwise see nothing at all.
 */
export function liveReading(r: Reading): Reading {
  return r.phase === "closed" && r.bookmark ? r.bookmark : r;
}

/** Whether there is anything of the seeker's own to show. */
export function hasReading(r: Reading): boolean {
  const live = liveReading(r);
  return live.pages.length > 0;
}

/**
 * Gather what the workbench shows. Opened on the demonstration, it uses the
 * bundled sample; opened on a reading, it uses whatever that reading has
 * reached — a profile alone, or a profile with a portrait, or all three.
 */
export function buildWorkbench(reading: Reading, source: WorkbenchSource): WorkbenchData {
  if (source === "sample") {
    return { source, portrait: SAMPLE_PORTRAIT, prophecy: SAMPLE_PROPHECY, profile: SAMPLE_PROFILE, pages: [], scripted: false };
  }
  const live = liveReading(reading);
  return { source, portrait: live.portrait, prophecy: live.prophecy, profile: profileOf(live.pages), pages: live.pages, scripted: !!live.mock };
}

import { createContext } from "react";

/**
 * Whether the cover's figures draw themselves in as it appears. They do when
 * the book is first shown, but not when it is being closed: then the cover
 * swings over already finished.
 */
export const CoverIntro = createContext(true);

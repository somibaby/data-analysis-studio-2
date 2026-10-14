// api/index.ts — combines datasets.ts and analysis.ts into the single
// `api` object every caller already uses (api.listDatasets(),
// api.capability(), ...); existing `from "./api"` imports elsewhere in
// the app keep resolving unchanged, and the call shape is identical to
// the pre-split single-file api.ts.
import { datasetsApi } from "./datasets";
import { analysisApi } from "./analysis";

export const api = { ...datasetsApi, ...analysisApi };

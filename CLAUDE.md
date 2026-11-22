# care_radiology_fe

CARE frontend plugin. PRs are reviewed by care_ci; the rules live in
`care-ecosystem/care_reviewer`. Keep this file under 60 lines — it is read on every review run.

## Identity
All four names agree here. Keep it that way — a `PLUGIN_SLUG` that drifts from the registered
name makes every config key fall back to its default, silently.

- `PLUGIN_SLUG`: `care_radiology_fe` — in `src/constants.ts`
- vite `federation({ name })`: `care_radiology_fe`
- manifest `plugin:`: `care_radiology_fe`
- `package.json` name: `care_radiology_fe`

## Entry points
`src/manifest.tsx` exposes:
- `components`: `ServiceRequestAction`, `FacilityHomeActions`, `DiagnosticReportOverride`
- `overrides`: `DiagnosticReportResultsTable` — must be **appended** to the deployment's
  `REACT_MFE_REGISTERED_COMPONENTS` allowlist, never assigned over it
- `encounterTabs`: `radiology`
- `devices`: configure forms and show-page cards for `DICOM_CARE_TYPE` and
  `DICOM_ENABLER_CARE_TYPE`
- `routes` from `src/routes.tsx`

Every pluggable component is `lazy()`-loaded and wrapped in `ErrorBoundary` + `Suspense` in the
manifest. New components must follow that — an unguarded plugin crash takes down the host page.

## Integrates with
- Backend plugin: `care_radiology` (`/api/care_radiology/`)
- Shared singletons in `vite.config.mjs`: react, react-dom, react-i18next,
  @tanstack/react-query, raviger, sonner
- Reads its own config through `src/utils/pluginConfig.ts` →
  `window.__CARE_PLUGIN_RUNTIME__.meta[PLUGIN_SLUG]`

## Deliberate deviations
- (none recorded)

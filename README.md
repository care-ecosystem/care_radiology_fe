# Care Radiology Frontend

A Care plugin that adds DICOM upload, study management, an OHIF viewer hand-off
and radiology report templates to Care's service request, encounter and facility
settings pages.

**In one paragraph:** the plugin is a Vite module-federation remote
(`remoteEntry.js`) that care_fe loads at runtime. It contributes only *additive*
pieces — pluggable slots, an encounter tab and its own routes — and declares no
component `overrides[]`, so it never shadows another plugin. Its own API calls
go to `/api/care_radiology/*`, served by the `care_radiology` backend plug.
Runtime behaviour is driven by the `PlugConfig` row for slug
`care_radiology_fe`.

## What the plugin registers

Care offers two extension mechanisms: **component overrides** (`overrides[]`,
priority-ranked, only the single highest-priority one renders) and **pluggable
slots** (`components{}`, additive, every plugin filling a slot shows up). This
plugin uses slots only.

`src/manifest.tsx`:

| Manifest field | Key | What it does |
|----------------|-----|--------------|
| `components{}` | `ServiceRequestAction` | `ServiceRequestView` — study table, DICOM upload dialog and the report-creation gate; rendered by the host inside `DiagnosticReportForm` |
| `components{}` | `FacilityHomeActions` | Entry into the report template manager, in Settings → General → Configurations |
| `components{}` | `DiagnosticReportOverride` | `ObservationTemplateOverride` — applies a saved observation template to the report form |
| `components{}` | `DiagnosticReportResultsOverride` | Template-driven results entry (see [Gotchas](#gotchas) — needs host support) |
| `encounterTabs{}` | `radiology` | Encounter-level study list; its tab label is the `ENCOUNTER_TAB__radiology` translation key |
| `routes` | — | The DICOM viewer route and the report-templates settings page |
| `diagnosticReportResultsOverrideCategory` | — | `"imaging"` — scopes the results override to imaging reports |

Routes (`src/routes.tsx`):

| Path | Component |
|------|-----------|
| `/facility/:facilityId/service_requests/:serviceRequestId/radiology/view/:studyid` | `DicomViewer` — iframes the OHIF viewer at `meta.radiologyViewerBaseUrl` |
| `/facility/:facilityId/settings/general/report_templates` | `ObservationTemplateSettings`; must stay in sync with `reportTemplatesPath` in `src/constants.ts` |

## Configuration

The plugin reads its runtime settings from the `PlugConfig` row for the slug
`care_radiology_fe` in Care's backend (`care.users.models.PlugConfig`: `slug` +
a `meta` JSON blob, served from `/api/v1/plug_config/`). `PluginEngine` publishes
that blob on `window.__CARE_PLUGIN_RUNTIME__.meta[slug]` and also passes it to
every pluggable component as a `__meta` prop.

Plugin *behaviour* flags live one level deeper, under `meta.config`. That
nesting is a convention this plugin owns: care_fe never inspects `config`, it
only passes the whole `meta` blob through. Unknown keys are therefore never
validated or rejected anywhere — they are silently ignored.

```jsonc
{
  "slug": "care_radiology_fe",
  "meta": {
    "url": "https://<host>/assets/remoteEntry.js",
    "radiologyViewerBaseUrl": "https://<ohif-host>",
    "config": {
      "allowDiagnosticReportWithoutActiveStudy": false
    }
  }
}
```

| Key | Level | Type | Read by |
|-----|-------|------|---------|
| `url` | `meta` | string (URL) | Care host — the federated `remoteEntry.js`; its **origin** is also where translations are fetched from |
| `name` | `meta` | string | Care host — the i18n namespace. ⚠️ If set, it must equal `care_radiology_fe` (see [i18n](#i18n)) |
| `localPath` | `meta` | string | Care host — overrides the translation base URL, for local development |
| `radiologyViewerBaseUrl` | `meta` | string (URL) | `src/components/DicomViewer.tsx`; empty string when unset |
| `allowDiagnosticReportWithoutActiveStudy` | `meta.config` | boolean | `src/utils/pluginConfig.ts` → `src/components/ServiceRequestView.tsx` |

**`allowDiagnosticReportWithoutActiveStudy` is the only behaviour flag read from
`meta.config`.** The report category is the other value that shapes what the
plugin shows, but it is compile-time — see
[the category](#the-report-category-imaging) below.

Accessors live in `src/utils/pluginConfig.ts`; the shape is typed in
`src/types/plugin.ts` (`RadiologyPluginConfig`, `PlugConfigMeta`), which mirrors
care_fe's `PlugConfigMeta` — a federated plugin cannot import the host's types,
so keep it in step if the host moves.

### `allowDiagnosticReportWithoutActiveStudy`

Controls whether a radiology service request can have a diagnostic report
created **before** any DICOM study has been uploaded. When report creation is
blocked, `ServiceRequestView` hides the host's sibling nodes below it (the
report-creation UI) via `useHostSiblingsHidden` and renders the
`radiology_report_needs_active_study` notice instead.

#### Possible values

The check is a strict identity comparison —
`getPluginConfig(meta).allowDiagnosticReportWithoutActiveStudy === true` — so
only the JSON boolean `true` opts in. Everything else falls through to the
blocking behaviour.

| Value in `meta.config` | Effect |
|------------------------|--------|
| `true` (JSON boolean) | **Allowed.** Report creation stays visible even with no unarchived study. |
| `false` (JSON boolean) | **Blocked** (the explicit default). |
| key omitted / `meta.config` absent / `meta` absent | **Blocked.** Same as `false`. |
| `"true"` (string), `1`, `"yes"`, any other truthy value | **Blocked.** ⚠️ Not coerced — a quoted `"true"` in the JSON silently behaves like `false`. |
| `null` | **Blocked.** |

#### Applying a change

`meta` is fetched by the host at load time and frozen (`deepFreeze`), so an
edited `PlugConfig` row needs a page reload to take effect. There is no
per-facility scoping: the row is global to the deployment.

### The report category (`imaging`)

Nearly everything the plugin renders is scoped to one category value, and it is
read in four places:

| Site | What it gates |
|------|---------------|
| `src/components/DiagnosticReportResultsOverride.tsx:152` | Skips any observation whose `observation_definition.category` is not the category |
| `src/components/ObservationTemplateOverride.tsx:397` | Scopes the templates offered inside the host's report form |
| `src/pages/ObservationTemplateSettings.tsx:106` | Filters the observation definitions a template can be built from |
| `src/manifest.tsx:106` | Published to the host as the `diagnosticReportResultsOverrideCategory` manifest field |

All four import `DIAGNOSTIC_REPORT_RESULTS_OVERRIDE_CATEGORY` from
`src/constants.ts`, where it is hardcoded to `"imaging"`. A sibling constant,
`SERVICE_REQUEST_OVERRIDE_CATEGORY`, holds the same value and gates
`ServiceRequestView`; the two are not linked.

**This is compile-time, not configuration.** Putting
`"diagnosticReportResultsOverrideCategory": "imaging"` in `meta.config` has no
effect — no accessor reads it, so the value never reaches those four sites.
Because the constant is already `"imaging"`, the key looks like it works;
setting it to any other value would prove otherwise. `RadiologyPluginConfig`
declares the key, which is what makes it look configurable (see
[Gotchas](#gotchas)). To change the category today, edit `src/constants.ts` and
rebuild.

## i18n

Translations live in `public/locale/en.json` and are fetched by the host from
`<origin of meta.url>/locale/<lang>.json` (or from `meta.localPath`). Every
component calls `useTranslation(PLUGIN_SLUG)`, so the namespace is the literal
`care_radiology_fe`.

care_fe resolves a plugin's namespace as `meta.name ?? slug`. **Setting
`meta.name` to anything other than `care_radiology_fe` silently breaks every
label in the plugin** — keys render as raw strings. Leave `name` unset, or set
it to the slug.

Only `en` ships today; adding a language means adding `public/locale/<lang>.json`.

## File map

| File | Role |
|------|------|
| `src/manifest.tsx` | Registers the slots, the encounter tab and the routes; every entry is lazy + `ErrorBoundary` wrapped |
| `src/routes.tsx` | Viewer route and report-templates settings route |
| `src/constants.ts` | Slug, category constants, access-token key, `reportTemplatesPath` |
| `src/utils/pluginConfig.ts` | `meta` / `meta.config` accessors, including the flag above |
| `src/types/plugin.ts` | Re-declared host meta types + `window` globals |
| `src/components/ServiceRequestView.tsx` | Study table, upload entry point, report-creation gate |
| `src/components/DicomUploader.tsx` | Upload dialog; links the uploaded study to the service request |
| `src/components/RadiologyStudyTable.tsx` | Study rows, archive action, viewer/report links |
| `src/components/DicomViewer.tsx` | OHIF hand-off at `meta.radiologyViewerBaseUrl` |
| `src/components/RadiologyEncounterTab.tsx` | Encounter-level study list |
| `src/components/ObservationTemplateOverride.tsx` | Applies a saved template inside the host's report form |
| `src/components/DiagnosticReportResultsOverride.tsx` | Template-driven results entry |
| `src/components/FacilityHomeActions.tsx` | Settings → General entry to the template manager |
| `src/pages/ObservationTemplateSettings.tsx` | Template CRUD page |
| `src/hooks/useHostSiblingsHidden.ts` | Hides the host's sibling nodes below our root (the report-creation gate) |
| `src/apis/` | Endpoint definitions, `fetch` wrapper, `APIError` |

## Gotchas

- **`useHostSiblingsHidden` manipulates the host's DOM.** It hides every
  `nextElementSibling` of our root inside the host's report form and restores
  the inline `display` on cleanup. It is positional: if care_fe reorders that
  form, the wrong nodes get hidden. This is the most fragile part of the plugin
  — treat "the report form looks wrong" as a DOM problem first.
- **The two `"imaging"` constants are separate.**
  `SERVICE_REQUEST_OVERRIDE_CATEGORY` and
  `DIAGNOSTIC_REPORT_RESULTS_OVERRIDE_CATEGORY` happen to hold the same value
  but are not linked; a typo in either yields no type error, just a component
  that renders nothing.
- **`RadiologyPluginConfig` declares a key nothing reads.**
  `diagnosticReportResultsOverrideCategory` is typed on the config interface
  (`src/types/plugin.ts`) but has no accessor and no caller — the category comes
  from the constant. Either wire it up through `pluginConfig.ts` or drop it from
  the type; as it stands it invites a `meta.config` entry that silently does
  nothing.
- **`DiagnosticReportResultsOverride` needs host support.** The slot and the
  `diagnosticReportResultsOverrideCategory` manifest field are only honoured by
  a care_fe that renders them — the slot is absent from
  `SupportedPluginComponents` in the care_fe this was checked against, so both
  are currently inert and the category only affects the plugin's own filtering.
  Verify against the care_fe version you deploy against.
- **Route order matters.** The settings route is matched ahead of core's
  `/facility/:facilityId/settings*` layout because care_fe merges plugin routes
  before app routes. Keep it in sync with `reportTemplatesPath`.
- **Shared deps must stay shared.** `vite.config.mjs` shares `react`,
  `react-dom`, `react-i18next`, `@tanstack/react-query`, `raviger` and `sonner`
  with the host. Un-sharing one gives the plugin a second copy of React or of
  the query client, and hooks stop working.

## Debugging checklist

| Symptom | Look at |
|---------|---------|
| Report creation is hidden with a "needs an active study" notice | The flag and its gating conditions above; is every study archived? |
| Setting the flag to `true` changed nothing | Is it a JSON boolean, not a string? Did the page reload? Is a build-time plugin entry overriding it? |
| All labels render as raw keys (`radiology_studies`) | i18n namespace — is `meta.name` set to something other than the slug? Is `/locale/en.json` reachable at the `meta.url` origin? |
| Studies never load, uploads 404 | The `care_radiology` backend plug, and `window.__CORE_ENV__.apiUrl` |
| The viewer opens blank | `meta.radiologyViewerBaseUrl` |
| Nothing from the plugin renders at all | `window.__CARE_PLUGIN_RUNTIME__.meta.care_radiology_fe` in the console; then the `meta.url` remote entry |
| The host's report form has missing sections | `useHostSiblingsHidden` |

## Development

```sh
npm install
npm run start   # vite build --watch + preview on :5173
npm run build   # stamps a version, then builds the remote entry
```

care_fe picks the plugin up either through `localDevPluginManifests` (local dev)
or through the `meta.url` remote entry. Env vars are exposed with the `REACT_`
prefix (`envPrefix` in `vite.config.mjs`). `dist/` is deployed as a static
Cloudflare Workers asset bundle (`wrangler.jsonc`).

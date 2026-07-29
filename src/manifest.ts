import { lazy } from "react";
import routes from "./routes";
import { DIAGNOSTIC_REPORT_RESULTS_OVERRIDE_CATEGORY } from "./constants";

const manifest = {
  plugin: "care_radiology_fe",
  routes,
  extends: [],
  components: {
    ServiceRequestAction: lazy(() => import("./components/ServiceRequestView")),
    DiagnosticReportResultsOverride: lazy(
      () => import("./components/DiagnosticReportResultsOverride"),
    ),
    DiagnosticReportOverride: lazy(
      () => import("./components/ObservationTemplateOverride"),
    ),
  },
  navItems: [],
  encounterTabs: {
    radiology: lazy(() => import("./components/RadiologyEncounterTab")),
  },
  diagnosticReportResultsOverrideCategory:
    DIAGNOSTIC_REPORT_RESULTS_OVERRIDE_CATEGORY,
};

export default manifest;

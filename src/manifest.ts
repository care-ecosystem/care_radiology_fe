import { lazy } from "react";
import routes from "./routes";

const manifest = {
  plugin: "care_radiology_fe",
  routes,
  extends: [],
  components: {
    ServiceRequestAction: lazy(() => import("./components/ServiceRequestView")),
    RadiologyDiagnosticReportResultsView: lazy(
      () => import("./components/DiagnosticReportResultsView"),
    ),
  },
  navItems: [],
  encounterTabs: {
    radiology: lazy(() => import("./components/RadiologyEncounterTab")),
  },
};

export default manifest;

import { lazy, Suspense } from "react";
import React from "react";
import routes from "./routes";
import { DIAGNOSTIC_REPORT_RESULTS_OVERRIDE_CATEGORY } from "./constants";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Lazy load all pluggable components
const ServiceRequestActionComponent = lazy(
  () => import("@/components/ServiceRequestView"),
);
const DiagnosticReportResultsOverrideComponent = lazy(
  () => import("@/components/DiagnosticReportResultsOverride"),
);
const DiagnosticReportOverrideComponent = lazy(
  () => import("@/components/ObservationTemplateOverride"),
);
const RadiologyEncounterTabComponent = lazy(
  () => import("@/components/RadiologyEncounterTab"),
);

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="w-full p-4">
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  );
}

// Wrapper for ServiceRequestAction
function ServiceRequestActionWrapper(props: any) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <ServiceRequestActionComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}

// Wrapper for DiagnosticReportResultsOverride
function DiagnosticReportResultsOverrideWrapper(props: any) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <DiagnosticReportResultsOverrideComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}

// Wrapper for DiagnosticReportOverride
function DiagnosticReportOverrideWrapper(props: any) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <DiagnosticReportOverrideComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}

// Wrapper for RadiologyEncounterTab
function RadiologyEncounterTabWrapper(props: any) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <RadiologyEncounterTabComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}

const manifest = {
  plugin: "care_radiology_fe",
  routes,
  extends: [],
  components: {
    ServiceRequestAction: ServiceRequestActionWrapper,
    DiagnosticReportResultsOverride: DiagnosticReportResultsOverrideWrapper,
    DiagnosticReportOverride: DiagnosticReportOverrideWrapper,
  },
  navItems: [],
  encounterTabs: {
    radiology: RadiologyEncounterTabWrapper,
  },
  diagnosticReportResultsOverrideCategory:
    DIAGNOSTIC_REPORT_RESULTS_OVERRIDE_CATEGORY,
};

export default manifest;

import { ComponentProps, lazy, Suspense } from "react";
import routes from "./routes";
import { Router, ScanHeart } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  DICOM_CARE_TYPE,
  DICOM_ENABLER_CARE_TYPE,
} from "@/types/modalityDevice";

// Lazy load all pluggable components
const ServiceRequestActionComponent = lazy(
  () => import("@/components/ServiceRequestView"),
);
const FacilityHomeActionsComponent = lazy(
  () => import("@/components/FacilityHomeActions"),
);
const DiagnosticReportResultsTableOverrideComponent = lazy(
  () => import("@/components/DiagnosticReportResultsTableOverride"),
);
const DiagnosticReportOverrideComponent = lazy(
  () => import("@/components/ObservationTemplateOverride"),
);
const RadiologyEncounterTabComponent = lazy(
  () => import("@/components/RadiologyEncounterTab"),
);
const DicomDeviceConfigureFormComponent = lazy(
  () => import("@/components/modality/DicomDeviceConfigureForm"),
);
const DicomDeviceShowPageCardComponent = lazy(
  () => import("@/components/modality/DicomDeviceShowPageCard"),
);
const DicomEnablerConfigureFormComponent = lazy(
  () => import("@/components/modality/DicomEnablerConfigureForm"),
);
const DicomEnablerShowPageCardComponent = lazy(
  () => import("@/components/modality/DicomEnablerShowPageCard"),
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

// Wrapper for FacilityHomeActions
function FacilityHomeActionsWrapper(props: any) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <FacilityHomeActionsComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}

// Wrapper for DiagnosticReportResultsTableOverride
function DiagnosticReportResultsTableOverrideWrapper(props: any) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <DiagnosticReportResultsTableOverrideComponent {...props} />
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

// Wrapper for the DICOM device configure form
function DicomDeviceConfigureFormWrapper(props: ComponentProps<typeof DicomDeviceConfigureFormComponent>) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <DicomDeviceConfigureFormComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}

// Wrapper for the DICOM device show page card
function DicomDeviceShowPageCardWrapper(props: ComponentProps<typeof DicomDeviceShowPageCardComponent>) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <DicomDeviceShowPageCardComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}

// Wrapper for the DICOM Enabler configure form
function DicomEnablerConfigureFormWrapper(props: ComponentProps<typeof DicomEnablerConfigureFormComponent>) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <DicomEnablerConfigureFormComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}

// Wrapper for the DICOM Enabler show page card
function DicomEnablerShowPageCardWrapper(props: ComponentProps<typeof DicomEnablerShowPageCardComponent>) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <DicomEnablerShowPageCardComponent {...props} />
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
    FacilityHomeActions: FacilityHomeActionsWrapper,
    DiagnosticReportOverride: DiagnosticReportOverrideWrapper,
  },
  overrides: [
    {
      component: "DiagnosticReportResultsTable",
      replacement: DiagnosticReportResultsTableOverrideWrapper,
    },
  ],
  navItems: [],
  encounterTabs: {
    radiology: RadiologyEncounterTabWrapper,
  },
  devices: [
    {
      type: DICOM_ENABLER_CARE_TYPE,
      icon: Router,
      configureForm: DicomEnablerConfigureFormWrapper,
      showPageCard: DicomEnablerShowPageCardWrapper,
    },
    {
      type: DICOM_CARE_TYPE,
      icon: ScanHeart,
      configureForm: DicomDeviceConfigureFormWrapper,
      showPageCard: DicomDeviceShowPageCardWrapper,
    },
  ],
};

export default manifest;

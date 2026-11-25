import { ComponentType, FC } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ACTIVITY_DEFINITION_IMAGING_CLASSIFICATION } from "@/constants";
import ServiceRequestView from "./ServiceRequestView";

type ReportWorkflowProps = {
  serviceRequestId: string;
  request?: { status?: string };
  activityDefinition?: { classification?: string };
  diagnosticReports?: { status?: string }[];
};

/**
 * Override for core's `ServiceRequestReportWorkflow`.
 *
 * Core renders the `ServiceRequestAction` slot only from inside the results
 * section, and hides that section once a service request is completed 
 *
 * The studies are rendered only for an imaging activity definition, and only
 * when core's own section is hidden
 */
export const ServiceRequestReportWorkflowOverride: FC<
  ReportWorkflowProps & { __base?: ComponentType<ReportWorkflowProps> }
> = ({ __base: Base, ...props }) => {
  const hasReportInProgress = (props.diagnosticReports ?? []).some(
    (report) => report.status !== "final",
  );
  const isImagingActivity =
    props.activityDefinition?.classification ===
    ACTIVITY_DEFINITION_IMAGING_CLASSIFICATION;
  const baseHidesStudies =
    isImagingActivity &&
    props.request?.status === "completed" &&
    !hasReportInProgress;

  return (
    <>
      {baseHidesStudies && (
        <ErrorBoundary>
          <ServiceRequestView serviceRequestId={props.serviceRequestId} />
        </ErrorBoundary>
      )}
      {Base ? <Base {...props} /> : null}
    </>
  );
};

export default ServiceRequestReportWorkflowOverride;

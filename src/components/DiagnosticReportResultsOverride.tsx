import { DIAGNOSTIC_REPORT_RESULTS_OVERRIDE_CATEGORY } from "@/constants";
import {
  DiagnosticReportObservation,
  ObservationValue,
} from "@/types/diagnosticReports";

function getValueText(value: ObservationValue) {
  if (!value?.value) return "-";
  const unit = value.unit?.code || value.unit?.display;
  return unit ? `${value.value} ${unit}` : value.value;
}

interface DiagnosticReportResultsViewProps {
  observations: DiagnosticReportObservation[];
}

export function DiagnosticReportResultsOverride({
  observations,
}: DiagnosticReportResultsViewProps) {
  if (!observations?.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      {observations.map((observation) => {
        if (observation.observation_definition?.category !== DIAGNOSTIC_REPORT_RESULTS_OVERRIDE_CATEGORY) {
          return null;
        }

        const hasComponents =
          observation.component && observation.component.length > 0;

        return (
          <div key={observation.id} className="space-y-4 mb-8">
            {hasComponents &&
              observation.component!.map((component, index) => (
                <div key={component.code?.code ?? index}>
                  <p className="text-sm text-gray-500">
                    {component.code?.display || "-"}
                  </p>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {getValueText(component.value)}
                  </p>
                </div>
              ))}
          </div>
        );
      })}
    </div>
  );
}

export default DiagnosticReportResultsOverride;

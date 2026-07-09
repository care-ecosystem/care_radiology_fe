interface ObservationValue {
  value?: string | null;
  unit?: { code?: string; display?: string } | null;
}

interface ObservationComponent {
  code?: { code?: string; display?: string } | null;
  value: ObservationValue;
}

interface ObservationDefinition {
  title?: string;
  code?: { code?: string; display?: string };
}

export interface DiagnosticReportObservation {
  id: string;
  value: ObservationValue;
  component?: ObservationComponent[];
  observation_definition?: ObservationDefinition;
}

interface DiagnosticReportResultsViewProps {
  observations: DiagnosticReportObservation[];
}

function getLabel(observation: DiagnosticReportObservation) {
  return (
    observation.observation_definition?.title ||
    observation.observation_definition?.code?.display ||
    "-"
  );
}

function getValueText(value: ObservationValue) {
  if (!value?.value) return "-";
  const unit = value.unit?.code || value.unit?.display;
  return unit ? `${value.value} ${unit}` : value.value;
}

/**
 * Report-style rendering (used in place of a table) for observations whose
 * values are free-text strings/textareas, e.g. radiology observations like
 * modality, body part, technique, findings, impression.
 */
export function DiagnosticReportResultsView({
  observations,
}: DiagnosticReportResultsViewProps) {
  if (!observations?.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      {observations.map((observation) => {
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

export default DiagnosticReportResultsView;

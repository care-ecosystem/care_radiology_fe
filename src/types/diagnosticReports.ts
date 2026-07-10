export interface ObservationValue {
  value?: string | null;
  unit?: { code?: string; display?: string } | null;
}

export interface ObservationComponent {
  code?: { code?: string; display?: string } | null;
  value: ObservationValue;
}

export interface ObservationDefinition {
  title?: string;
  code?: { code?: string; display?: string };
  category?: string;
}

export interface DiagnosticReportObservation {
  id: string;
  value: ObservationValue;
  component?: ObservationComponent[];
  observation_definition?: ObservationDefinition;
}

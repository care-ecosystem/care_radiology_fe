export interface ObservationValue {
  value?: string | null;
  unit?: { code?: string; display?: string } | null;
}

export interface ObservationComponent {
  code?: { code?: string; display?: string } | null;
  value: ObservationValue;
}

export interface ObservationDefinitionComponent {
  code?: { code?: string; display?: string };
  permitted_data_type?: string;
  permitted_unit?: { code?: string; display?: string } | null;
}

export interface ObservationDefinition {
  id?: string;
  title?: string;
  code?: { code?: string; display?: string };
  category?: string;
  permitted_data_type?: string;
  permitted_unit?: { code?: string; display?: string } | null;
  component?: ObservationDefinitionComponent[] | null;
}

export interface DiagnosticReportObservation {
  id: string;
  value: ObservationValue;
  component?: ObservationComponent[];
  observation_definition?: ObservationDefinition;
}

export interface DiagnosticReport {
  id: string;
  observations?: DiagnosticReportObservation[];
  [key: string]: unknown;
}

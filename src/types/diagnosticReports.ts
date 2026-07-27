export interface ObservationValue {
  value?: string | null;
  unit?: { code?: string; display?: string } | null;
}

export interface ObservationComponent {
  code?: { code?: string; display?: string } | null;
  value: ObservationValue;
}

// Mirrors ObservationDefinitionComponentSpec (backend): schema for one
// component of a definition — code/display + expected data type.
export interface ObservationDefinitionComponent {
  code?: { code?: string; display?: string };
  permitted_data_type?: string;
}

export interface ObservationDefinition {
  id?: string;
  title?: string;
  code?: { code?: string; display?: string };
  category?: string;
  permitted_data_type?: string;
  component?: ObservationDefinitionComponent[];
}

export interface DiagnosticReportObservation {
  id: string;
  value: ObservationValue;
  component?: ObservationComponent[];
  observation_definition?: ObservationDefinition;
}

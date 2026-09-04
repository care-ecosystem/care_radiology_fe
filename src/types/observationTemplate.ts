export interface ObservationTemplateField {
  code: string;
  value: string | null;
  description?: string | null;
}

export interface ObservationTemplate {
  id: string;
  title: string;
  description?: string | null;
  facility: string;
  observation_definition: string;
  activity_definition?: string | null;
  fields: ObservationTemplateField[];
}

import { ObservationDefinition } from "@/types/diagnosticReports";

export interface ActivityDefinitionListItem {
  id: string;
  slug: string;
  title: string;
  status?: string;
  classification?: string;
  code?: { code?: string; display?: string } | null;
}

export interface ActivityDefinitionDetail extends ActivityDefinitionListItem {
  observation_result_requirements: ObservationDefinition[];
}

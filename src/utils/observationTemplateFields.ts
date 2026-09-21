import {
  DiagnosticReportObservation,
  ObservationDefinition,
} from "@/types/diagnosticReports";
import { ObservationTemplateField } from "@/types/observationTemplate";
import { encodeFieldValue } from "@/utils/templateFieldValue";

function unitCode(unit?: { code?: string; display?: string } | null) {
  return unit?.code || unit?.display || undefined;
}

/**
 * Derives the editable fields of a template from an observation definition:
 * one field per component, or a single field when the definition has none.
 *
 * With an `observation`, values and units are seeded from that recorded
 * observation (saving an existing report as a template). Without one, values
 * start blank and units fall back to the definition's permitted unit
 * (authoring a template from scratch).
 */
export function buildTemplateFields(
  definition: ObservationDefinition,
  observation?: DiagnosticReportObservation,
): ObservationTemplateField[] {
  if (!definition.id) return [];

  const components = definition.component ?? [];

  if (components.length > 0) {
    return components.map((component) => {
      const code = component.code?.code ?? "";
      const recorded = observation?.component?.find(
        (c) => c.code?.code === code,
      );
      const unit = observation
        ? unitCode(recorded?.value?.unit)
        : unitCode(component.permitted_unit);

      return {
        code,
        value: encodeFieldValue(recorded?.value?.value ?? "", unit),
        description: component.code?.display ?? "",
      };
    });
  }

  return [
    {
      code: definition.code?.code ?? definition.id,
      value: encodeFieldValue(
        observation?.value?.value ?? "",
        observation
          ? unitCode(observation.value?.unit)
          : unitCode(definition.permitted_unit),
      ),
      description: definition.title || definition.code?.display || "",
    },
  ];
}

/** Human label for a field code within its observation definition. */
export function displayForCode(
  definition: ObservationDefinition,
  code: string,
): string {
  if (code === (definition.code?.code ?? definition.id)) {
    return definition.title || definition.code?.display || code;
  }
  const component = (definition.component ?? []).find(
    (c) => c?.code?.code === code,
  );
  return component?.code?.display || code;
}

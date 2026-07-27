import { useMemo, useState } from "react";
import { apis, ObservationTemplateField } from "@/apis";
import { DIAGNOSTIC_REPORT_RESULTS_OVERRIDE_CATEGORY, PLUGIN_SLUG } from "@/constants";
import {
  DiagnosticReportObservation,
  ObservationValue,
} from "@/types/diagnosticReports";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";

function getValueText(value: ObservationValue) {
  if (!value?.value) return "-";
  const unit = value.unit?.code || value.unit?.display;
  return unit ? `${value.value} ${unit}` : value.value;
}

// One row per template field: code/display/dataType are recovered from the
// observation's definition schema; value is prefilled from the actual saved
// observation, only description is left for the user to fill in.
interface FieldRow extends ObservationTemplateField {
  display: string;
  dataType?: string;
}

function fieldRowsFromObservation(
  observation: DiagnosticReportObservation,
): FieldRow[] {
  const definition = observation.observation_definition;
  const hasComponents = (observation.component ?? []).length > 0;

  if (hasComponents) {
    return observation.component!.map((component) => {
      const code = component.code?.code ?? "";
      const schema = definition?.component?.find(
        (c) => c.code?.code === code,
      );
      return {
        code,
        display: component.code?.display || code,
        dataType: schema?.permitted_data_type,
        value: component.value?.value ?? "",
        description: "",
      };
    });
  }

  return [
    {
      code: definition?.code?.code ?? definition?.id ?? "",
      display: definition?.title || definition?.code?.display || "Value",
      dataType: definition?.permitted_data_type,
      value: observation.value?.value ?? "",
      description: "",
    },
  ];
}

interface DiagnosticReportResultsViewProps {
  observations: DiagnosticReportObservation[];
}

export function DiagnosticReportResultsOverride({
  observations,
}: DiagnosticReportResultsViewProps) {
  const { t } = useTranslation(PLUGIN_SLUG);
  const facilityId = useMemo(
    () => window.location.pathname.match(/\/facility\/([^/]+)/)?.[1],
    [],
  );

  const [saveTemplateFor, setSaveTemplateFor] =
    useState<DiagnosticReportObservation | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [saving, setSaving] = useState(false);

  if (!observations?.length) {
    return null;
  }

  const openSaveTemplate = (observation: DiagnosticReportObservation) => {
    setSaveTemplateFor(observation);
    setTitle("");
    setDescription("");
    setFields(fieldRowsFromObservation(observation));
  };

  const updateFieldValue = (index: number, value: string) => {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, value } : f)),
    );
  };

  const updateFieldDescription = (index: number, fieldDescription: string) => {
    setFields((prev) =>
      prev.map((f, i) =>
        i === index ? { ...f, description: fieldDescription } : f,
      ),
    );
  };

  const saveTemplate = async () => {
    if (!saveTemplateFor?.observation_definition?.id || !facilityId) return;
    if (!title.trim()) {
      toast.warning(t("radiology_please_enter_template_title"));
      return;
    }
    setSaving(true);
    try {
      await apis.observationTemplate.create({
        facility: facilityId,
        observation_definition: saveTemplateFor.observation_definition.id,
        title: title.trim(),
        description: description.trim() || undefined,
        fields: fields.map(
          ({ code, value, description: fieldDescription }) => ({
            code,
            value,
            description: fieldDescription,
          }),
        ),
      });
      toast.success(t("radiology_template_saved_successfully!"));
      setSaveTemplateFor(null);
    } catch (err) {
      console.error("Failed to save observation template", err);
      toast.error(t("radiology_failed_to_save_template"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {observations.map((observation) => {
        if (
          observation.observation_definition?.category !==
          DIAGNOSTIC_REPORT_RESULTS_OVERRIDE_CATEGORY
        ) {
          return null;
        }

        const hasComponents =
          observation.component && observation.component.length > 0;

        return (
          <div
            key={observation.id}
            className="space-y-4 mb-8 rounded-lg border border-gray-200 bg-white p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-gray-700 truncate">
                {observation.observation_definition?.title ||
                  observation.observation_definition?.code?.display}
              </span>
              {facilityId && observation.observation_definition?.id && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openSaveTemplate(observation)}
                >
                  <Plus className="size-4" />
                  {t("radiology_save_as_observation_template")}
                </Button>
              )}
            </div>

            {!hasComponents && (
              <div>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {getValueText(observation.value)}
                </p>
              </div>
            )}

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

      {/* Save as Template dialog */}
      <Dialog
        open={!!saveTemplateFor}
        onOpenChange={(open) => !open && setSaveTemplateFor(null)}
      >
        <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t("radiology_save_as_observation_template")}</DialogTitle>
            <DialogDescription>
              {saveTemplateFor?.observation_definition?.title ||
                saveTemplateFor?.observation_definition?.code?.display}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-1 px-1.5">
            <div className="space-y-2">
              <Label>{t("radiology_name")}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("radiology_description")}</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("radiology_observation_data")}</Label>
              <div className="rounded-md bg-gray-50 p-4 space-y-4">
                {fields.map((field, index) => (
                  <div key={field.code} className="space-y-2">
                    <Label className="text-sm text-gray-700">
                      {field.display}
                    </Label>
                    <Input
                      className="bg-white"
                      placeholder={t("radiology_field_description")}
                      value={field.description ?? ""}
                      onChange={(e) =>
                        updateFieldDescription(index, e.target.value)
                      }
                    />
                    {field.dataType === "text" ? (
                      <Textarea
                        className="bg-white min-h-20"
                        placeholder={t("radiology_field_value")}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          updateFieldValue(index, e.target.value)
                        }
                      />
                    ) : (
                      <Input
                        className="bg-white"
                        type={
                          field.dataType === "decimal" ||
                          field.dataType === "integer"
                            ? "number"
                            : "text"
                        }
                        placeholder={t("radiology_field_value")}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          updateFieldValue(index, e.target.value)
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="border-t border-gray-100 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSaveTemplateFor(null)}
            >
              {t("radiology_cancel")}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={saveTemplate}
              loading={saving}
            >
              {t("radiology_save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DiagnosticReportResultsOverride;

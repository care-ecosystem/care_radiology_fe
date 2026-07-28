import { useMemo, useState } from "react";
import { apis, ObservationTemplateField } from "@/apis";
import { APIError } from "@/apis/request";
import {
  DIAGNOSTIC_REPORT_RESULTS_OVERRIDE_CATEGORY,
  PLUGIN_SLUG,
} from "@/constants";
import {
  DiagnosticReportObservation,
  ObservationValue,
} from "@/types/diagnosticReports";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
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
import { encodeFieldValue } from "@/utils/templateFieldValue";

function getValueText(value: ObservationValue) {
  if (!value?.value) return "-";
  const unit = value.unit?.code || value.unit?.display;
  return unit ? `${value.value} ${unit}` : value.value;
}

// `unit` is frontend-only — encoded into `value` at save time (see
// templateFieldValue.ts), since ObservationTemplateData has no unit column.
interface FieldRow extends ObservationTemplateField {
  display: string;
  unit?: string;
}

function fieldRowsFromObservation(
  observation: DiagnosticReportObservation,
): FieldRow[] {
  const definition = observation.observation_definition;
  const hasComponents = (observation.component ?? []).length > 0;

  if (hasComponents) {
    return observation.component!.map((component) => {
      const code = component.code?.code ?? "";
      return {
        code,
        display: component.code?.display || code,
        value: component.value?.value ?? "",
        unit: component.value?.unit?.code || component.value?.unit?.display,
        description: "",
      };
    });
  }

  return [
    {
      code: definition?.code?.code ?? definition?.id ?? "",
      display: definition?.title || definition?.code?.display || "Value",
      value: observation.value?.value ?? "",
      unit: observation.value?.unit?.code || observation.value?.unit?.display,
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
  // const [isFieldsOpen, setIsFieldsOpen] = useState(false);

  if (!observations?.length) {
    return null;
  }

  const openSaveTemplate = (observation: DiagnosticReportObservation) => {
    setSaveTemplateFor(observation);
    setTitle("");
    setDescription("");
    setFields(fieldRowsFromObservation(observation));
    // setIsFieldsOpen(false);
  };

  // const updateFieldDescription = (index: number, fieldDescription: string) => {
  //   setFields((prev) =>
  //     prev.map((f, i) =>
  //       i === index ? { ...f, description: fieldDescription } : f,
  //     ),
  //   );
  // };

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
          ({ code, value, unit, description: fieldDescription }) => ({
            code,
            value: encodeFieldValue(value ?? "", unit),
            description: fieldDescription,
          }),
        ),
      });
      toast.success(t("radiology_template_saved_successfully!"));
      setSaveTemplateFor(null);
    } catch (err) {
      console.error("Failed to save observation template", err);
      toast.error(
        err instanceof APIError
          ? err.message
          : t("radiology_failed_to_save_template"),
      );
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

      <Dialog
        open={!!saveTemplateFor}
        onOpenChange={(open) => !open && setSaveTemplateFor(null)}
      >
        <DialogContent className="sm:max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {t("radiology_save_as_observation_template")}
            </DialogTitle>
            <DialogDescription>
              {saveTemplateFor?.observation_definition?.title ||
                saveTemplateFor?.observation_definition?.code?.display}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-1 px-1.5">
            <div className="space-y-2">
              <Label htmlFor="template-name">
                {t("radiology_name")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="template-name"
                placeholder={t("radiology_enter_name")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">
                {t("radiology_description")}
              </Label>
              <Input
                id="template-description"
                placeholder={t("radiology_description")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Preview of template data */}

            {/* <div className="rounded-md bg-gray-100">
              <button
                type="button"
                className="flex w-full items-center justify-between p-4"
                onClick={() => setIsFieldsOpen((prev) => !prev)}
              >
                <Label className="cursor-pointer">
                  {t("radiology_observation_data")}
                </Label>
                {isFieldsOpen ? (
                  <ChevronUp className="size-4 text-gray-500" />
                ) : (
                  <ChevronDown className="size-4 text-gray-500" />
                )}
              </button>
              {isFieldsOpen && (
                <div className="px-4 pb-4">
                  {fields.map((field, index) => (
                    <div key={field.code}>
                      {index > 0 && (
                        <Separator className="my-4" style={{ height: 1 }} />
                      )}
                      <div className="space-y-1.5">
                        <p className="text-sm text-gray-700">
                          {field.display}
                        </p>
                        <Input
                          className="bg-white"
                          placeholder={t("radiology_field_description")}
                          value={field.description ?? ""}
                          onChange={(e) =>
                            updateFieldDescription(index, e.target.value)
                          }
                        />
                        <p className="text-sm text-gray-500 whitespace-pre-wrap break-words">
                          {field.value || "-"}
                          {field.unit && <span> {field.unit}</span>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div> */}
          </div>
          <DialogFooter className="pt-4">
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
              disabled={!title.trim()}
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

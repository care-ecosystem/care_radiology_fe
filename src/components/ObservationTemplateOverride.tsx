import { useMemo, useState } from "react";
import { apis, ObservationTemplate, ObservationTemplateField } from "@/apis";
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
import { ScrollArea } from "./ui/scroll-area";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { PLUGIN_SLUG } from "@/constants";
import { ClipboardList, Plus } from "lucide-react";

// Aligns focus ring color with care_fe's Input/Textarea (primary-500 ring,
// gray-950 is this plugin's shadcn default and reads out of place inside care_fe).
const FOCUS_RING =
  "focus-visible:border-primary-500 focus-visible:ring-primary-500 focus-visible:ring-1";

// Mirrors the subset of QuestionType actually special-cased by DiagnosticReportForm
// in care_fe: "text" renders as a textarea, "decimal"/"integer" as a number input,
// everything else (string, boolean, date, choice, ...) falls back to a plain text input.
type PermittedDataType = string;

interface ObservationDefinition {
  id: string;
  title?: string;
  code?: { code: string; display?: string };
  permitted_data_type?: PermittedDataType;
  component?: {
    code: { code: string; display?: string };
    permitted_data_type?: PermittedDataType;
  }[];
}

interface Props {
  observationDefinitions: ObservationDefinition[];
  handleComponentValueChange: (
    definitionId: string,
    index: number,
    componentCode: string,
    value: string,
    unit: string,
  ) => void;
  handleValueChange: (
    definitionId: string,
    index: number,
    value: string,
  ) => void;
  disabled?: boolean;
}

// One row per template field: code/display/dataType come from the observation
// definition and are fixed; only value and description are filled in by the user.
interface FieldRow extends ObservationTemplateField {
  display: string;
  dataType?: PermittedDataType;
}

function fieldRowsFor(definition: ObservationDefinition): FieldRow[] {
  const rows: FieldRow[] = [
    {
      code: definition.code?.code ?? definition.id,
      display: definition.title || definition.code?.display || "Value",
      dataType: definition.permitted_data_type,
      value: "",
      description: "",
    },
  ];
  for (const component of definition.component ?? []) {
    rows.push({
      code: component.code.code,
      display: component.code.display || component.code.code,
      dataType: component.permitted_data_type,
      value: "",
      description: "",
    });
  }
  return rows;
}

export default function ObservationTemplateOverride({
  observationDefinitions,
  handleComponentValueChange,
  handleValueChange,
  disabled,
}: Props) {
  const { t } = useTranslation(PLUGIN_SLUG);
  const facilityId = useMemo(
    () => window.location.pathname.match(/\/facility\/([^/]+)/)?.[1],
    [],
  );

  const [useTemplateFor, setUseTemplateFor] =
    useState<ObservationDefinition | null>(null);
  const [templates, setTemplates] = useState<ObservationTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const [saveTemplateFor, setSaveTemplateFor] =
    useState<ObservationDefinition | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [saving, setSaving] = useState(false);

  if (!facilityId || !observationDefinitions?.length) return null;

  const openUseTemplate = async (definition: ObservationDefinition) => {
    setUseTemplateFor(definition);
    setLoadingTemplates(true);
    try {
      const res = await apis.observationTemplate.fetchAll({
        facility: facilityId,
        observation_definition: definition.id,
      });
      setTemplates(res.results || []);
    } catch (err) {
      console.error("Failed to load observation templates", err);
      toast.error(t("radiology_failed_to_load_templates"));
    } finally {
      setLoadingTemplates(false);
    }
  };

  const applyTemplate = (
    definition: ObservationDefinition,
    template: ObservationTemplate,
  ) => {
    const componentCodes = new Set(
      (definition.component ?? []).map((c) => c.code.code),
    );
    for (const field of template.fields) {
      if (componentCodes.has(field.code)) {
        handleComponentValueChange(
          definition.id,
          0,
          field.code,
          field.value ?? "",
          "",
        );
      } else {
        handleValueChange(definition.id, 0, field.value ?? "");
      }
    }
    toast.success(t("radiology_template_applied"));
    setUseTemplateFor(null);
  };

  const openSaveTemplate = (definition: ObservationDefinition) => {
    setSaveTemplateFor(definition);
    setTitle("");
    setDescription("");
    setFields(fieldRowsFor(definition));
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
    if (!saveTemplateFor) return;
    if (!title.trim()) {
      toast.warning(t("radiology_please_enter_template_title"));
      return;
    }
    setSaving(true);
    try {
      await apis.observationTemplate.create({
        facility: facilityId,
        observation_definition: saveTemplateFor.id,
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
    <div className="flex flex-col gap-2 mb-4">
      {observationDefinitions.map((definition) => (
        <div
          key={definition.id}
          className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5"
        >
          <span className="text-sm font-medium text-gray-700 truncate">
            {definition.title ||
              definition.code?.display ||
              t("radiology_observation")}
          </span>
          <div className="flex gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => openUseTemplate(definition)}
            >
              <ClipboardList className="size-4" />
              {t("radiology_use_template")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => openSaveTemplate(definition)}
            >
              <Plus className="size-4" />
              {t("radiology_save_as_template")}
            </Button>
          </div>
        </div>
      ))}

      {/* Use Template dialog */}
      <Dialog
        open={!!useTemplateFor}
        onOpenChange={(open) => !open && setUseTemplateFor(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("radiology_use_template")}</DialogTitle>
            <DialogDescription>
              {useTemplateFor?.title || useTemplateFor?.code?.display}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-80 px-1.5">
            {loadingTemplates && (
              <p className="text-sm text-gray-500 py-1">
                {t("radiology_loading")}
              </p>
            )}
            {!loadingTemplates && templates.length === 0 && (
              <p className="text-sm text-gray-500 py-1">
                {t("radiology_no_templates_found")}
              </p>
            )}
            <div className="flex flex-col gap-2 py-1">
              {templates.map((template) => (
                <button
                  type="button"
                  key={template.id}
                  className={`text-left rounded-md bg-gray-50 p-3 transition-colors hover:bg-gray-100 focus-visible:outline-hidden ${FOCUS_RING}`}
                  onClick={() =>
                    useTemplateFor && applyTemplate(useTemplateFor, template)
                  }
                >
                  <p className="font-medium text-sm">{template.title}</p>
                  {template.description && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      {template.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Save as Template dialog */}
      <Dialog
        open={!!saveTemplateFor}
        onOpenChange={(open) => !open && setSaveTemplateFor(null)}
      >
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t("radiology_save_as_template")}</DialogTitle>
            <DialogDescription>
              {saveTemplateFor?.title || saveTemplateFor?.code?.display}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-4 px-1.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("radiology_name")}</Label>
                <Input
                  className={FOCUS_RING}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("radiology_description")}</Label>
                <Input
                  className={FOCUS_RING}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("radiology_fields")}</Label>
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div
                    key={field.code}
                    className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 rounded-md bg-gray-50 p-3"
                  >
                    <Label className="text-sm text-gray-700 flex items-center sm:pr-2">
                      {field.display}
                    </Label>
                    {field.dataType === "text" ? (
                      <Textarea
                        className={`bg-white min-h-20 ${FOCUS_RING}`}
                        placeholder={t("radiology_field_value")}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          updateFieldValue(index, e.target.value)
                        }
                      />
                    ) : (
                      <Input
                        className={`bg-white ${FOCUS_RING}`}
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
                    <Input
                      className={`bg-white ${FOCUS_RING}`}
                      placeholder={t("radiology_field_description")}
                      value={field.description ?? ""}
                      onChange={(e) =>
                        updateFieldDescription(index, e.target.value)
                      }
                    />
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
            <Button type="button" onClick={saveTemplate} loading={saving}>
              {t("radiology_save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

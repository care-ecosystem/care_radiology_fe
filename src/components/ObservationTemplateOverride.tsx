import { useEffect, useMemo, useState } from "react";
import { apis, ObservationTemplate, ObservationTemplateField } from "@/apis";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
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
import { Skeleton } from "./ui/skeleton";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { PLUGIN_SLUG } from "@/constants";
import { ClipboardList, Pencil, Plus } from "lucide-react";

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

// Template fields only store {code, value, description} — recover a human
// display name for a code from the definition/component it belongs to.
function displayForCode(
  definition: ObservationDefinition,
  code: string,
): string {
  if (code === (definition.code?.code ?? definition.id)) {
    return definition.title || definition.code?.display || code;
  }
  const component = (definition.component ?? []).find(
    (c) => c.code.code === code,
  );
  return component?.code.display || code;
}

function fieldRowsFor(definition: ObservationDefinition): FieldRow[] {
  const hasComponents = (definition.component ?? []).length > 0;

  // Mirrors care_fe's DiagnosticReportForm: an observation with components
  // (e.g. blood pressure -> systolic/diastolic) never uses its own top-level
  // value, per FHIR Observation semantics, so no main-value row is offered.
  if (hasComponents) {
    return definition.component!.map((component) => ({
      code: component.code.code,
      display: component.code.display || component.code.code,
      dataType: component.permitted_data_type,
      value: "",
      description: "",
    }));
  }

  return [
    {
      code: definition.code?.code ?? definition.id,
      display: definition.title || definition.code?.display || "Value",
      dataType: definition.permitted_data_type,
      value: "",
      description: "",
    },
  ];
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
  const [searchQuery, setSearchQuery] = useState("");
  const [templates, setTemplates] = useState<ObservationTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<ObservationTemplate | null>(null);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [saveTemplateFor, setSaveTemplateFor] =
    useState<ObservationDefinition | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [saving, setSaving] = useState(false);

  // Only title/description are selectable for edit — the backend's update
  // endpoint (ObservationTemplateUpdateSpec) only accepts those two fields,
  // so per-field value/description edits can't be persisted and aren't offered.
  const selectTemplate = (template: ObservationTemplate | null) => {
    setSelectedTemplate(template);
    setIsEditingTemplate(false);
    setEditTitle(template?.title ?? "");
    setEditDescription(template?.description ?? "");
  };

  // Debounced, search-driven fetch: re-runs whenever the dialog opens for a
  // definition or the search query changes. Server-side pagination defaults
  // to 14 and hard-caps at 200 (CareLimitOffsetPagination), so rather than
  // ever trying to load "all" templates, narrowing via `title` server-side
  // is what actually scales past a handful of saved templates.
  useEffect(() => {
    const definitionId = useTemplateFor?.id;
    if (!definitionId || !facilityId) return;
    setLoadingTemplates(true);
    const handle = setTimeout(async () => {
      try {
        const res = await apis.observationTemplate.fetchAll({
          facility: facilityId,
          observation_definition: definitionId,
          title: searchQuery.trim() || undefined,
          limit: 50,
        });
        const results = res.results || [];
        setTemplates(results);
        selectTemplate(results[0] ?? null);
      } catch (err) {
        console.error("Failed to load observation templates", err);
        toast.error(t("radiology_failed_to_load_templates"));
      } finally {
        setLoadingTemplates(false);
      }
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useTemplateFor?.id, searchQuery, facilityId]);

  if (!facilityId || !observationDefinitions?.length) return null;

  const openUseTemplate = (definition: ObservationDefinition) => {
    setUseTemplateFor(definition);
    setSearchQuery("");
    setTemplates([]);
    selectTemplate(null);
  };

  const saveTemplateEdit = async () => {
    if (!selectedTemplate) return;
    if (!editTitle.trim()) {
      toast.warning(t("radiology_please_enter_template_title"));
      return;
    }
    setSavingEdit(true);
    try {
      const updated = await apis.observationTemplate.update(
        selectedTemplate.id,
        {
          facility: facilityId,
          title: editTitle.trim(),
          description: editDescription.trim(),
        },
      );
      setTemplates((prev) =>
        prev.map((tpl) => (tpl.id === updated.id ? updated : tpl)),
      );
      setSelectedTemplate(updated);
      setIsEditingTemplate(false);
      toast.success(t("radiology_template_updated_successfully"));
    } catch (err) {
      console.error("Failed to update observation template", err);
      toast.error(t("radiology_failed_to_update_template"));
    } finally {
      setSavingEdit(false);
    }
  };

  const applyTemplate = (
    definition: ObservationDefinition,
    template: ObservationTemplate,
  ) => {
    const componentCodes = new Set(
      (definition.component ?? []).map((c) => c.code.code),
    );
    const hasComponents = componentCodes.size > 0;
    for (const field of template.fields) {
      if (componentCodes.has(field.code)) {
        handleComponentValueChange(
          definition.id,
          0,
          field.code,
          field.value ?? "",
          "",
        );
      } else if (!hasComponents) {
        // Matches care_fe: a definition with components has no top-level
        // value to write to, so a stray non-component field is ignored.
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
    <>
      <Card className="mb-4 shadow-none rounded-lg border-gray-200 bg-gray-50">
        <CardContent className="p-4">
          <div className="grid gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-base font-semibold text-gray-950">
                {t("radiology_observation_templates")}
              </Label>
            </div>
            <div className="flex flex-col gap-2">
              {observationDefinitions.map((definition) => (
                <div
                  key={definition.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2.5 bg-gray-100/50"
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
                      onClick={() => openSaveTemplate(definition)}
                    >
                      <Plus className="size-4" />
                      {t("radiology_create_template")}
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={disabled}
                      onClick={() => openUseTemplate(definition)}
                    >
                      <ClipboardList className="size-4" />
                      {t("radiology_use_template")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Use Template dialog */}
      <Dialog
        open={!!useTemplateFor}
        onOpenChange={(open) => !open && setUseTemplateFor(null)}
      >
        <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t("radiology_use_template")}</DialogTitle>
            <DialogDescription>
              {useTemplateFor?.title || useTemplateFor?.code?.display}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 flex gap-4 overflow-hidden">
            {/* Template list */}
            <div className="w-72 shrink-0 h-full flex flex-col border-r border-gray-100 pr-4">
              <div className="p-1.5 shrink-0">
                <Input
                  placeholder={t("radiology_search_templates")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <ScrollArea className="flex-1 min-h-0 px-1.5">
                {loadingTemplates && (
                  <div className="flex flex-col gap-2 py-1">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="rounded-md border border-gray-200 p-3 space-y-2"
                      >
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    ))}
                  </div>
                )}
                {!loadingTemplates && templates.length === 0 && (
                  <p className="text-sm text-gray-500 py-1">
                    {t("radiology_no_templates_found")}
                  </p>
                )}
                <div className="flex flex-col gap-2 py-1">
                  {!loadingTemplates &&
                    templates.map((template) => (
                      <button
                        type="button"
                        key={template.id}
                        className={`block w-full min-w-0 text-left rounded-md border p-3 transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:border-primary-500 focus-visible:ring-primary-500 ${
                          selectedTemplate?.id === template.id
                            ? "bg-primary-100 border-primary-300 text-primary-950"
                            : "bg-white border-gray-200 hover:bg-gray-50"
                        }`}
                        onClick={() => selectTemplate(template)}
                      >
                        <p className="font-medium text-sm truncate">
                          {template.title}
                        </p>
                        {template.description && (
                          <p className="text-sm text-gray-500 mt-0.5 line-clamp-2 break-words">
                            {template.description}
                          </p>
                        )}
                      </button>
                    ))}
                </div>
              </ScrollArea>
            </div>

            {/* Preview */}
            <div className="flex-1 min-w-0 h-full flex flex-col">
              {selectedTemplate ? (
                <>
                  <div className="flex items-start justify-between gap-3 px-1.5 pb-3 shrink-0">
                    {isEditingTemplate ? (
                      <div className="flex-1 space-y-2">
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                        />
                        <Textarea
                          className="min-h-16"
                          placeholder={t("radiology_description")}
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                        />
                      </div>
                    ) : (
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-gray-900">
                          {selectedTemplate.title}
                        </p>
                        {selectedTemplate.description && (
                          <p className="text-sm text-gray-500">
                            {selectedTemplate.description}
                          </p>
                        )}
                      </div>
                    )}
                    {isEditingTemplate ? (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => selectTemplate(selectedTemplate)}
                        >
                          {t("radiology_cancel")}
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={saveTemplateEdit}
                          loading={savingEdit}
                        >
                          {t("radiology_update")}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => setIsEditingTemplate(true)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    )}
                  </div>

                  <ScrollArea className="flex-1 min-h-0 px-1.5">
                    <div className="space-y-2 py-1">
                      {selectedTemplate.fields.map((field) => (
                        <div
                          key={field.code}
                          className="rounded-md bg-gray-50 p-3 space-y-1"
                        >
                          <p className="text-sm font-medium text-gray-900">
                            {useTemplateFor &&
                              displayForCode(useTemplateFor, field.code)}
                          </p>
                          {field.description && (
                            <p className="text-sm text-gray-500 break-words">
                              {field.description}
                            </p>
                          )}
                          <p className="text-sm text-gray-700 break-words">
                            {field.value || "-"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              ) : (
                !loadingTemplates && (
                  <p className="text-sm text-gray-500 py-1 px-1.5 m-auto">
                    {t("radiology_no_templates_found")}
                  </p>
                )
              )}
            </div>
          </div>

          <DialogFooter className="border-t border-gray-100 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setUseTemplateFor(null)}
            >
              {t("radiology_cancel")}
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!selectedTemplate}
              onClick={() =>
                useTemplateFor &&
                selectedTemplate &&
                applyTemplate(useTemplateFor, selectedTemplate)
              }
            >
              {t("radiology_use_template")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save as Template dialog */}
      <Dialog
        open={!!saveTemplateFor}
        onOpenChange={(open) => !open && setSaveTemplateFor(null)}
      >
        <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t("radiology_create_template")}</DialogTitle>
            <DialogDescription>
              {saveTemplateFor?.title || saveTemplateFor?.code?.display}
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
    </>
  );
}

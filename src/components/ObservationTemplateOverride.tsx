import { useEffect, useMemo, useRef, useState } from "react";
import { apis, ObservationTemplate } from "@/apis";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
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
import { ScrollArea } from "./ui/scroll-area";
import { Skeleton } from "./ui/skeleton";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  DIAGNOSTIC_REPORT_RESULTS_OVERRIDE_CATEGORY,
  PLUGIN_SLUG,
} from "@/constants";
import { ClipboardList, Pencil } from "lucide-react";
import { decodeFieldValue } from "@/utils/templateFieldValue";
import { ObservationDefinition } from "@/types/diagnosticReports";

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
  // handleValueChange's own unit param only seeds a brand-new entry and
  // no-ops otherwise, so this is the only reliable way to set a unit on an
  // existing non-component field.
  handleUnitChange?: (
    definitionId: string,
    index: number,
    unit: string,
  ) => void;
  disabled?: boolean;
}

// Recovers a human display name for a code from the definition/component it
// belongs to, since template fields only store the raw code.
function displayForCode(
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

export default function ObservationTemplateOverride({
  observationDefinitions,
  handleComponentValueChange,
  handleValueChange,
  handleUnitChange,
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

  // Read inside async callbacks after an await, where closed-over state/props
  // would otherwise reflect the render the callback started in, not "now".
  const selectedTemplateIdRef = useRef<string | null>(null);
  selectedTemplateIdRef.current = selectedTemplate?.id ?? null;
  const useTemplateForIdRef = useRef<string | undefined>(undefined);
  useTemplateForIdRef.current = useTemplateFor?.id;
  const [savingEdit, setSavingEdit] = useState(false);

  // Only title/description are editable — ObservationTemplateUpdateSpec
  // doesn't accept field-level changes.
  const selectTemplate = (template: ObservationTemplate | null) => {
    setSelectedTemplate(template);
    setIsEditingTemplate(false);
    setEditTitle(template?.title ?? "");
    setEditDescription(template?.description ?? "");
  };

  // Debounced, server-side search — pagination caps at 200
  // (CareLimitOffsetPagination), so this scales better than loading "all".
  useEffect(() => {
    const definitionId = useTemplateFor?.id;
    if (!definitionId || !facilityId) return;
    setLoadingTemplates(true);
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const res = await apis.observationTemplate.fetchAll({
          facility: facilityId,
          observation_definition: definitionId,
          title: searchQuery.trim() || undefined,
          limit: 50,
        });
        if (cancelled) return;
        const results = res.results || [];
        setTemplates(results);
        selectTemplate(results[0] ?? null);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load observation templates", err);
        toast.error(t("radiology_failed_to_load_templates"));
      } finally {
        if (!cancelled) setLoadingTemplates(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
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
    const editingId = selectedTemplate.id;
    const editingDefinitionId = useTemplateFor?.id;
    setSavingEdit(true);
    try {
      const updated = await apis.observationTemplate.update(editingId, {
        facility: facilityId,
        title: editTitle.trim(),
        description: editDescription.trim(),
      });
      setTemplates((prev) =>
        prev.map((tpl) => (tpl.id === updated.id ? updated : tpl)),
      );
      const stillEditingSameOne =
        selectedTemplateIdRef.current === editingId &&
        useTemplateForIdRef.current === editingDefinitionId;
      if (stillEditingSameOne) {
        setSelectedTemplate(updated);
        setIsEditingTemplate(false);
      }
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
    const definitionId = definition.id;
    if (!definitionId) return;

    const componentCodes = new Set(
      (definition.component ?? [])
        .map((c) => c.code?.code)
        .filter((code): code is string => !!code),
    );
    const hasComponents = componentCodes.size > 0;
    for (const field of template.fields) {
      const { value, unit } = decodeFieldValue(field.value);
      if (componentCodes.has(field.code)) {
        handleComponentValueChange(
          definitionId,
          0,
          field.code,
          value,
          unit ?? "",
        );
      } else if (!hasComponents) {
        // A definition with components has no top-level value to write to.
        handleValueChange(definitionId, 0, value);
        if (unit) handleUnitChange?.(definitionId, 0, unit);
      }
    }
    toast.success(t("radiology_template_applied"));
    setUseTemplateFor(null);
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
              {observationDefinitions.map((definition) => {
                if (
                  definition.category !==
                  DIAGNOSTIC_REPORT_RESULTS_OVERRIDE_CATEGORY
                ) {
                  return null;
                }
                return (
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
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

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

            <div className="flex-1 min-w-0 h-full flex flex-col">
              {selectedTemplate ? (
                <>
                  {isEditingTemplate ? (
                    <div className="space-y-3 px-1.5 pb-3 shrink-0">
                      <div className="space-y-2">
                        <Label>
                          {t("radiology_name")}{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          placeholder={t("radiology_enter_name")}
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("radiology_description")}</Label>
                        <Input
                          placeholder={t("radiology_description")}
                          value={editDescription}
                          onChange={(e) =>
                            setEditDescription(e.target.value)
                          }
                        />
                      </div>
                      <div className="flex justify-end gap-2">
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
                          disabled={!editTitle.trim()}
                        >
                          {t("radiology_update")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3 px-1.5 pb-3 shrink-0">
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => setIsEditingTemplate(true)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </div>
                  )}

                  <ScrollArea className="flex-1 min-h-0 px-1.5">
                    <div className="space-y-2 py-1">
                      {selectedTemplate.fields.map((field) => {
                        const { value, unit } = decodeFieldValue(field.value);
                        return (
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
                              {value
                                ? unit
                                  ? `${value} ${unit}`
                                  : value
                                : "-"}
                            </p>
                          </div>
                        );
                      })}
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
              disabled={!selectedTemplate || isEditingTemplate}
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
    </>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apis } from "@/apis";
import { ObservationTemplate } from "@/types/observationTemplate";
import { PaginatedResponse } from "@/apis/types";
import { APIError, request } from "@/apis/request";
import { debounced } from "@/utils/query";
import { useServiceRequestDetail } from "@/hooks/useServiceRequestDetail";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  DIAGNOSTIC_REPORT_RESULTS_OVERRIDE_CATEGORY,
  PLUGIN_SLUG,
  SERVICE_REQUEST_OVERRIDE_CATEGORY,
} from "@/constants";
import { ClipboardList, Pencil, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { decodeFieldValue, encodeFieldValue } from "@/utils/templateFieldValue";
import {
  ObservationDefinition,
  DiagnosticReportObservation,
  DiagnosticReport,
} from "@/types/diagnosticReports";
import { ObservationTemplateField } from "@/types/observationTemplate";

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
  handleUnitChange?: (
    definitionId: string,
    index: number,
    unit: string,
  ) => void;
  disabled?: boolean;
}

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
  const serviceRequestId = useMemo(
    () =>
      window.location.pathname.match(/\/service_requests\/([^/]+)/)?.[1],
    [],
  );

  const { data: serviceRequestDetail } = useServiceRequestDetail(
    facilityId,
    serviceRequestId,
  );

  const queryClient = useQueryClient();

  const [useTemplateFor, setUseTemplateFor] =
    useState<ObservationDefinition | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] =
    useState<ObservationTemplate | null>(null);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const [saveTemplateFor, setSaveTemplateFor] =
    useState<ObservationDefinition | null>(null);
  const [saveTitle, setSaveTitle] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [saveFields, setSaveFields] = useState<ObservationTemplateField[]>([]);
  const [showTemplateFields, setShowTemplateFields] = useState(false);

  const selectionTokenRef = useRef(0);
  const bumpSelectionToken = () => {
    selectionTokenRef.current += 1;
  };

  const selectTemplate = (template: ObservationTemplate | null) => {
    bumpSelectionToken();
    setSelectedTemplate(template);
    setIsEditingTemplate(false);
    setEditTitle(template?.title ?? "");
    setEditDescription(template?.description ?? "");
  };

  const closeUseTemplateDialog = () => {
    bumpSelectionToken();
    setUseTemplateFor(null);
  };

  const definitionId = useTemplateFor?.id;
  const templatesQueryKey = (defId: string | undefined) =>
    ["observationTemplates", facilityId, defId] as const;

  const {
    data: templatesData,
    isLoading: loadingTemplates,
    error: templatesError,
  } = useQuery<PaginatedResponse<ObservationTemplate>>({
    queryKey: [...templatesQueryKey(definitionId), searchQuery],
    queryFn: debounced(
      () =>
        apis.observationTemplate.fetchAll({
          facility: facilityId!,
          observation_definition: definitionId!,
          title: searchQuery.trim() || undefined,
          limit: 50,
        }),
      300,
    ),
    enabled: !!facilityId && !!definitionId,
  });
  const templates = templatesData?.results ?? [];

  useEffect(() => {
    if (!templatesError) return;
    console.error("Failed to load observation templates", templatesError);
    toast.error(
      templatesError instanceof APIError
        ? templatesError.message
        : t("radiology_failed_to_load_templates"),
    );
  }, [templatesError, t]);

  // Reselects on a new definition/search key, or if the selection got filtered out by an edit.
  const autoSelectedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!templatesData) return;
    const key = `${definitionId ?? ""}::${searchQuery}`;
    const isNewKey = autoSelectedKeyRef.current !== key;
    const selectionDropped =
      !!selectedTemplate &&
      !templatesData.results.some((tpl) => tpl.id === selectedTemplate.id);
    if (!isNewKey && !selectionDropped) return;
    autoSelectedKeyRef.current = key;
    selectTemplate(templatesData.results[0] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definitionId, searchQuery, templatesData]);

  const updateTemplateMutation = useMutation({
    mutationFn: (vars: {
      id: string;
      definitionId: string;
      title: string;
      description: string;
    }) =>
      apis.observationTemplate.update(vars.id, {
        facility: facilityId!,
        title: vars.title,
        description: vars.description,
      }),
    onSuccess: (updated, vars) => {
      queryClient.setQueriesData<PaginatedResponse<ObservationTemplate>>(
        { queryKey: templatesQueryKey(vars.definitionId) },
        (old) =>
          old && {
            ...old,
            results: old.results.map((tpl) =>
              tpl.id === updated.id ? updated : tpl,
            ),
          },
      );
      // Invalidate so the active search re-fetches
      queryClient.invalidateQueries({
        queryKey: templatesQueryKey(vars.definitionId),
      });
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: apis.observationTemplate.create,
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: templatesQueryKey(vars.observation_definition),
      });
      toast.success(t("radiology_template_saved_successfully!"));
      setSaveTemplateFor(null);
    },
    onError: (err) => {
      console.error("Failed to save observation template", err);
      toast.error(
        err instanceof APIError
          ? err.message
          : t("radiology_failed_to_save_template"),
      );
    },
  });

  if (!facilityId || !observationDefinitions?.length) return null;
  if (serviceRequestDetail?.category !== SERVICE_REQUEST_OVERRIDE_CATEGORY) {
    return null;
  }

  const hasDiagnosticReports =
    (serviceRequestDetail?.diagnostic_reports?.length ?? 0) > 0;

  const extractFieldsFromObservation = (
    definition: ObservationDefinition,
    observation?: DiagnosticReportObservation,
  ): ObservationTemplateField[] => {
    if (!definition.id) return [];

    const hasComponents = (definition.component ?? []).length > 0;

    if (hasComponents) {
      return definition.component!.map((comp) => {
        const componentCode = comp.code?.code ?? "";
        const observationComponent = observation?.component?.find(
          (c) => c.code?.code === componentCode,
        );
        const value = observationComponent?.value?.value ?? "";
        const unit =
          observationComponent?.value?.unit?.code ||
          observationComponent?.value?.unit?.display;

        return {
          code: componentCode,
          value: encodeFieldValue(value, unit),
          description: comp.code?.display ?? "",
        };
      });
    }

    return [
      {
        code: definition.code?.code ?? definition.id,
        value: encodeFieldValue(
          observation?.value?.value ?? "",
          observation?.value?.unit?.code ||
            observation?.value?.unit?.display,
        ),
        description: definition.title || definition.code?.display || "",
      },
    ];
  };

  const openSaveTemplate = async (definition: ObservationDefinition) => {
    if (!facilityId || !serviceRequestId || !definition.id) {
      toast.error(t("radiology_no_diagnostic_report_to_save"));
      return;
    }

    try {
      // Check if service request has diagnostic reports
      const diagnosticReports = serviceRequestDetail?.diagnostic_reports;

      if (!diagnosticReports || diagnosticReports.length === 0) {
        toast.error(t("radiology_no_diagnostic_report_to_save"));
        return;
      }

      // Find the latest diagnostic report
      const latestReport = diagnosticReports[0];

      // Get patient ID from service request
      const patientId = serviceRequestDetail?.encounter?.patient?.id;
      if (!patientId) {
        toast.error(t("radiology_no_diagnostic_report_to_save"));
        return;
      }

      // Fetch full diagnostic report with observations using patient endpoint
      const fullReport = await request<DiagnosticReport>(
        `/api/v1/patient/${patientId}/diagnostic_report/${latestReport.id}/`,
      );


      // Find observation for this definition
      const observation = fullReport.observations?.find(
        (obs) => obs.observation_definition?.id === definition.id,
      );

      if (!observation) {
        console.error(
          "No matching observation found for definition ID:",
          definition.id,
        );
        toast.error(t("radiology_no_observation_found_in_report"));
        return;
      }

      setSaveTemplateFor(definition);
      setSaveTitle("");
      setSaveDescription("");
      setSaveFields(extractFieldsFromObservation(definition, observation));
      setShowTemplateFields(false);
    } catch (error) {
      console.error("Failed to fetch diagnostic report", error);
      toast.error(
        error instanceof APIError
          ? error.message
          : t("radiology_failed_to_fetch_diagnostic_report"),
      );
    }
  };

  const saveTemplate = () => {
    if (!saveTemplateFor?.id || !facilityId) return;
    if (!saveTitle.trim()) {
      toast.warning(t("radiology_please_enter_template_title"));
      return;
    }
    createTemplateMutation.mutate({
      facility: facilityId,
      observation_definition: saveTemplateFor.id,
      title: saveTitle.trim(),
      description: saveDescription.trim() || undefined,
      fields: saveFields,
    });
  };

  const openUseTemplate = (definition: ObservationDefinition) => {
    bumpSelectionToken();
    // Closing clears `definitionId` to a never-fetched key, so the effect's
    // `!templatesData` guard skips updating this ref — it can still hold a
    // stale match from before close. Reset here so every open reselects.
    autoSelectedKeyRef.current = null;
    setUseTemplateFor(definition);
    setSearchQuery("");
    selectTemplate(null);
  };

  const saveTemplateEdit = () => {
    if (!selectedTemplate || !definitionId) return;
    if (!editTitle.trim()) {
      toast.warning(t("radiology_please_enter_template_title"));
      return;
    }
    const tokenAtStart = selectionTokenRef.current;
    updateTemplateMutation.mutate(
      {
        id: selectedTemplate.id,
        definitionId,
        title: editTitle.trim(),
        description: editDescription.trim(),
      },
      {
        onSuccess: (updated) => {
          if (selectionTokenRef.current === tokenAtStart) {
            setSelectedTemplate(updated);
            setIsEditingTemplate(false);
          }
          toast.success(t("radiology_template_updated_successfully"));
        },
        onError: (err) => {
          console.error("Failed to update observation template", err);
          toast.error(
            err instanceof APIError
              ? err.message
              : t("radiology_failed_to_update_template"),
          );
        },
      },
    );
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
        handleValueChange(definitionId, 0, value);
        if (unit) handleUnitChange?.(definitionId, 0, unit);
      }
    }
    toast.success(t("radiology_template_applied"));
    closeUseTemplateDialog();
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
                      {hasDiagnosticReports && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={disabled}
                          onClick={() => openSaveTemplate(definition)}
                        >
                          <Plus className="size-4" />
                          {t("radiology_save_as_observation_template")}
                        </Button>
                      )}
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
        onOpenChange={(open) => !open && closeUseTemplateDialog()}
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
                          loading={updateTemplateMutation.isPending}
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
              onClick={() => closeUseTemplateDialog()}
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
              {saveTemplateFor?.title || saveTemplateFor?.code?.display}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-1 px-1.5">
            <div className="space-y-2">
              <Label htmlFor="save-template-name">
                {t("radiology_name")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="save-template-name"
                placeholder={t("radiology_enter_name")}
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="save-template-description">
                {t("radiology_description")}
              </Label>
              <Input
                id="save-template-description"
                placeholder={t("radiology_description")}
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowTemplateFields(!showTemplateFields)}
                className="flex items-center gap-2 w-full text-left text-sm font-medium text-gray-900 hover:text-gray-700 transition-colors"
              >
                {showTemplateFields ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
                {t("radiology_template_fields")} ({saveFields.length})
              </button>

              {showTemplateFields && (
                <div className="space-y-3 pt-2">
                  {saveFields.map((field, index) => (
                    <div
                      key={field.code}
                      className="rounded-md bg-gray-50 p-3 space-y-2"
                    >
                      <p className="text-sm font-medium text-gray-900">
                        {field.description || field.code}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-600">
                            {t("radiology_value")}
                          </Label>
                          <Input
                            placeholder={t("radiology_enter_value")}
                            value={decodeFieldValue(field.value).value}
                            onChange={(e) => {
                              const newFields = [...saveFields];
                              const { unit } = decodeFieldValue(field.value);
                              newFields[index] = {
                                ...field,
                                value: encodeFieldValue(e.target.value, unit),
                              };
                              setSaveFields(newFields);
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-600">
                            {t("radiology_unit")}
                          </Label>
                          <Input
                            placeholder={t("radiology_unit")}
                            value={decodeFieldValue(field.value).unit || ""}
                            onChange={(e) => {
                              const newFields = [...saveFields];
                              const { value } = decodeFieldValue(field.value);
                              newFields[index] = {
                                ...field,
                                value: encodeFieldValue(value, e.target.value),
                              };
                              setSaveFields(newFields);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
              loading={createTemplateMutation.isPending}
              disabled={!saveTitle.trim()}
            >
              {t("radiology_save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

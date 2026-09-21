import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ClipboardList, Pencil, Plus } from "lucide-react";
import { navigate } from "raviger";

import { apis } from "@/apis";
import { APIError } from "@/apis/request";
import { PaginatedResponse } from "@/apis/types";
import {
  DIAGNOSTIC_REPORT_RESULTS_OVERRIDE_CATEGORY,
  PLUGIN_SLUG,
} from "@/constants";
import { ActivityDefinitionListItem } from "@/types/activityDefinition";
import { ObservationDefinition } from "@/types/diagnosticReports";
import {
  ObservationTemplate,
  ObservationTemplateField,
} from "@/types/observationTemplate";
import { debounced } from "@/utils/query";
import {
  buildTemplateFields,
  displayForCode,
} from "@/utils/observationTemplateFields";
import { decodeFieldValue, encodeFieldValue } from "@/utils/templateFieldValue";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ComboBox, ComboBoxOption } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Pagination from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 10;

export default function ObservationTemplateSettings({
  facilityId,
}: {
  facilityId: string;
}) {
  const { t } = useTranslation(PLUGIN_SLUG);
  const queryClient = useQueryClient();

  const [activitySearch, setActivitySearch] = useState("");
  const [activity, setActivity] = useState<ActivityDefinitionListItem | null>(
    null,
  );
  const [observationId, setObservationId] = useState<string | null>(null);
  const [templateSearch, setTemplateSearch] = useState("");
  const [page, setPage] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ObservationTemplate | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formFields, setFormFields] = useState<ObservationTemplateField[]>([]);

  const {
    data: activitiesData,
    isLoading: loadingActivities,
    error: activitiesError,
  } = useQuery<PaginatedResponse<ActivityDefinitionListItem>>({
    queryKey: ["radiologyActivityDefinitions", facilityId, activitySearch],
    queryFn: debounced(
      () =>
        apis.activityDefinition.list({
          facility: facilityId,
          title: activitySearch.trim() || undefined,
          limit: 20,
        }),
      300,
    ),
  });

  const { data: activityDetail, isLoading: loadingActivityDetail } = useQuery({
    queryKey: ["radiologyActivityDefinition", facilityId, activity?.slug],
    queryFn: () => apis.activityDefinition.retrieve(facilityId, activity!.slug),
    enabled: !!activity?.slug,
  });

  const observationDefinitions = useMemo(
    () =>
      (activityDetail?.observation_result_requirements ?? []).filter(
        (definition) =>
          !!definition.id &&
          definition.category === DIAGNOSTIC_REPORT_RESULTS_OVERRIDE_CATEGORY,
      ),
    [activityDetail],
  );

  const observation: ObservationDefinition | undefined = useMemo(
    () => observationDefinitions.find((d) => d.id === observationId),
    [observationDefinitions, observationId],
  );

  const filtersReady = !!activity && !!observation;

  const {
    data: templatesData,
    isLoading: loadingTemplates,
    error: templatesError,
  } = useQuery<PaginatedResponse<ObservationTemplate>>({
    queryKey: [
      "radiologyObservationTemplates",
      facilityId,
      activity?.id,
      observationId,
      templateSearch,
      page,
    ],
    queryFn: debounced(
      () =>
        apis.observationTemplate.fetchAll({
          facility: facilityId,
          observation_definition: observationId!,
          activity_definition: activity!.id,
          title: templateSearch.trim() || undefined,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        }),
      300,
    ),
    enabled: filtersReady,
  });

  const templates = templatesData?.results ?? [];
  const total = templatesData?.count ?? 0;

  useEffect(() => {
    if (!activitiesError) return;
    console.error("Failed to load activity definitions", activitiesError);
    toast.error(
      activitiesError instanceof APIError
        ? activitiesError.message
        : t("radiology_failed_to_load_activities"),
    );
  }, [activitiesError, t]);

  useEffect(() => {
    if (!templatesError) return;
    console.error("Failed to load observation templates", templatesError);
    toast.error(
      templatesError instanceof APIError
        ? templatesError.message
        : t("radiology_failed_to_load_templates"),
    );
  }, [templatesError, t]);

  const activityOptions: ComboBoxOption[] = useMemo(() => {
    const toOption = (item: ActivityDefinitionListItem) => ({
      value: item.id,
      label: item.title,
      description: item.code?.display ?? undefined,
    });
    const results = activitiesData?.results ?? [];
    const options = results.map(toOption);
    if (activity && !results.some((item) => item.id === activity.id)) {
      options.unshift(toOption(activity));
    }
    return options;
  }, [activitiesData, activity]);

  const observationOptions: ComboBoxOption[] = observationDefinitions.map(
    (definition) => ({
      value: definition.id!,
      label: definition.title || definition.code?.display || definition.id!,
      description: definition.code?.display ?? undefined,
    }),
  );

  const invalidateTemplates = () => {
    queryClient.invalidateQueries({
      queryKey: ["radiologyObservationTemplates"],
    });

    queryClient.invalidateQueries({ queryKey: ["observationTemplates"] });
  };

  const createMutation = useMutation({
    mutationFn: apis.observationTemplate.create,
    onSuccess: () => {
      invalidateTemplates();
      toast.success(t("radiology_template_saved_successfully!"));
      setCreateOpen(false);
    },
    onError: (error) => {
      console.error("Failed to create observation template", error);
      toast.error(
        error instanceof APIError
          ? error.message
          : t("radiology_failed_to_save_template"),
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; title: string; description: string }) =>
      apis.observationTemplate.update(vars.id, {
        facility: facilityId,
        title: vars.title,
        description: vars.description,
      }),
    onSuccess: () => {
      invalidateTemplates();
      toast.success(t("radiology_template_updated_successfully"));
      setEditing(null);
    },
    onError: (error) => {
      console.error("Failed to update observation template", error);
      toast.error(
        error instanceof APIError
          ? error.message
          : t("radiology_failed_to_update_template"),
      );
    },
  });

  const selectActivity = (id: string) => {
    const next = (activitiesData?.results ?? []).find(
      (item) => item.id === id,
    );
    if (!next) return;
    setActivity(next);
    setObservationId(null);
    setTemplateSearch("");
    setPage(0);
  };

  const selectObservation = (id: string) => {
    setObservationId(id);
    setTemplateSearch("");
    setPage(0);
  };

  const openCreate = () => {
    if (!observation) return;
    setFormTitle("");
    setFormDescription("");
    setFormFields(buildTemplateFields(observation));
    setCreateOpen(true);
  };

  const openEdit = (template: ObservationTemplate) => {
    setFormTitle(template.title);
    setFormDescription(template.description ?? "");
    setEditing(template);
  };

  const submitCreate = () => {
    if (!observation?.id || !activity) return;
    if (!formTitle.trim()) {
      toast.warning(t("radiology_please_enter_template_title"));
      return;
    }
    createMutation.mutate({
      facility: facilityId,
      observation_definition: observation.id,
      activity_definition: activity.id,
      title: formTitle.trim(),
      description: formDescription.trim() || undefined,
      fields: formFields,
    });
  };

  const submitEdit = () => {
    if (!editing) return;
    if (!formTitle.trim()) {
      toast.warning(t("radiology_please_enter_template_title"));
      return;
    }
    updateMutation.mutate({
      id: editing.id,
      title: formTitle.trim(),
      description: formDescription.trim(),
    });
  };

  // Only the value is editable; the unit comes from the definition and is
  // carried through untouched.
  const updateFormField = (index: number, patch: { value: string }) => {
    setFormFields((fields) =>
      fields.map((field, i) =>
        i === index
          ? {
              ...field,
              value: encodeFieldValue(
                patch.value,
                decodeFieldValue(field.value).unit,
              ),
            }
          : field,
      ),
    );
  };

  return (
    <div className="container mx-auto flex max-w-5xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mb-2 w-fit"
          onClick={() => navigate(`/facility/${facilityId}/settings/general`)}
        >
          <ArrowLeft className="size-4" />
          {t("radiology_back")}
        </Button>
        <h1 className="text-2xl font-bold text-gray-700 mb-2">
          {t("radiology_manage_report_templates")}
        </h1>
        <p className="text-sm text-gray-600">
          {t("radiology_manage_templates_description")}
        </p>
      </div>

      <Card className="shadow-none">
        <CardContent className="p-0">
          <div className="grid gap-4 p-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="template-activity">
                {t("radiology_activity")}
              </Label>
              <ComboBox
                id="template-activity"
                options={activityOptions}
                value={activity?.id}
                onSelect={selectActivity}
                placeholder={t("radiology_select_activity")}
                searchPlaceholder={t("radiology_search_activities")}
                emptyMessage={t("radiology_no_activities_found")}
                loadingMessage={t("radiology_loading")}
                search={activitySearch}
                onSearchChange={setActivitySearch}
                loading={loadingActivities}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-observation">
                {t("radiology_observation")}
              </Label>
              <ComboBox
                id="template-observation"
                options={observationOptions}
                value={observationId}
                onSelect={selectObservation}
                placeholder={t("radiology_select_observation")}
                searchPlaceholder={t("radiology_search_observations")}
                emptyMessage={t("radiology_no_observations_for_activity")}
                loadingMessage={t("radiology_loading")}
                loading={loadingActivityDetail}
                disabled={!activity}
              />
            </div>
          </div>

          <div className="border-t border-gray-200" />

          {!filtersReady ? (
            <div
              className="flex flex-col items-center justify-center gap-2 px-4 text-center"
              style={{ paddingBlock: "9.75rem" }}
            >
              <ClipboardList className="size-8 text-gray-400" />
              <p className="text-sm text-gray-600">
                {t("radiology_select_activity_and_observation")}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Input
                  className="sm:max-w-xs"
                  placeholder={t("radiology_search_templates")}
                  value={templateSearch}
                  onChange={(event) => {
                    setTemplateSearch(event.target.value);
                    setPage(0);
                  }}
                />
                <Button type="button" variant="primary" onClick={openCreate}>
                  <Plus className="size-4" />
                  {t("radiology_create_template")}
                </Button>
              </div>

              {loadingTemplates ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full" />
                  ))}
                </div>
              ) : templates.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-500">
                  {t("radiology_no_templates_found")}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("radiology_name")}</TableHead>
                      <TableHead>{t("radiology_description")}</TableHead>
                      <TableHead className="w-24">
                        {t("radiology_template_fields")}
                      </TableHead>
                      <TableHead className="w-24 text-right">
                        {t("radiology_actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium text-gray-900">
                          {template.title}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {template.description || "-"}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {template.fields.length}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={t("radiology_edit_template")}
                            onClick={() => openEdit(template)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <Pagination
                data={{ totalCount: total }}
                onChange={(nextPage) => setPage(nextPage - 1)}
                defaultPerPage={PAGE_SIZE}
                cPage={page + 1}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => !open && setCreateOpen(false)}
      >
        <DialogContent className="flex max-h-[85vh] max-w-[calc(100%-2rem)] flex-col overflow-hidden sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("radiology_create_template")}</DialogTitle>
            <DialogDescription className="break-words">
              {observation?.title || observation?.code?.display}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1.5 py-1">
            <div className="space-y-2">
              <Label htmlFor="create-template-name">
                {t("radiology_name")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-template-name"
                placeholder={t("radiology_enter_name")}
                value={formTitle}
                onChange={(event) => setFormTitle(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-template-description">
                {t("radiology_description")}
              </Label>
              <Input
                id="create-template-description"
                placeholder={t("radiology_description")}
                value={formDescription}
                onChange={(event) => setFormDescription(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>
                {t("radiology_template_fields")} ({formFields.length})
              </Label>
              <p className="text-xs text-gray-500">
                {t("radiology_fields_locked_after_create")}
              </p>
              {formFields.map((field, index) => {
                const { value, unit } = decodeFieldValue(field.value);
                return (
                  <div
                    key={field.code}
                    className="space-y-2 rounded-md bg-gray-50 p-3"
                  >
                    <Label
                      htmlFor={`create-field-${field.code}`}
                      className="text-sm font-medium text-gray-900"
                    >
                      {field.description || field.code}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id={`create-field-${field.code}`}
                        placeholder={t("radiology_enter_value")}
                        value={value}
                        onChange={(event) =>
                          updateFormField(index, { value: event.target.value })
                        }
                      />
                      {/* Fixed: the report form accepts only this one unit. */}
                      {unit && (
                        <span className="shrink-0 text-sm text-gray-600">
                          {unit}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter className="gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              {t("radiology_cancel")}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={submitCreate}
              loading={createMutation.isPending}
              disabled={!formTitle.trim()}
            >
              {t("radiology_save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="flex max-h-[85vh] max-w-[calc(100%-2rem)] flex-col overflow-hidden sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("radiology_edit_template")}</DialogTitle>
            <DialogDescription className="break-words">
              {observation?.title || observation?.code?.display}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1.5 py-1">
            <div className="space-y-2">
              <Label htmlFor="edit-template-name">
                {t("radiology_name")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-template-name"
                placeholder={t("radiology_enter_name")}
                value={formTitle}
                onChange={(event) => setFormTitle(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-template-description">
                {t("radiology_description")}
              </Label>
              <Input
                id="edit-template-description"
                placeholder={t("radiology_description")}
                value={formDescription}
                onChange={(event) => setFormDescription(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("radiology_template_fields")}</Label>
              <p className="text-xs text-gray-500">
                {t("radiology_fields_are_read_only")}
              </p>
              {editing?.fields.map((field) => {
                const { value, unit } = decodeFieldValue(field.value);
                return (
                  <div
                    key={field.code}
                    className="space-y-1 rounded-md bg-gray-50 p-3"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {observation
                        ? displayForCode(observation, field.code)
                        : field.code}
                    </p>
                    {field.description && (
                      <p className="break-words text-sm text-gray-500">
                        {field.description}
                      </p>
                    )}
                    <p className="break-words text-sm text-gray-700">
                      {value ? (unit ? `${value} ${unit}` : value) : "-"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter className="gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing(null)}
            >
              {t("radiology_cancel")}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={submitEdit}
              loading={updateMutation.isPending}
              disabled={!formTitle.trim()}
            >
              {t("radiology_update")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

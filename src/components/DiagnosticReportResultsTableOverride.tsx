import { ComponentType, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apis } from "@/apis";
import { ObservationTemplateField } from "@/types/observationTemplate";
import { APIError } from "@/apis/request";
import { PaginatedResponse } from "@/apis/types";
import { useServiceRequestDetail } from "@/hooks/useServiceRequestDetail";
import { useRadiologyStudies } from "@/hooks/useRadiologyStudies";
import {
  DIAGNOSTIC_REPORT_RESULTS_OVERRIDE_CATEGORY,
  PLUGIN_SLUG,
} from "@/constants";
import {
  DiagnosticReport,
  DiagnosticReportObservation,
  ObservationValue,
} from "@/types/diagnosticReports";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { encodeFieldValue } from "@/utils/templateFieldValue";
import RadiologyStudyTable from "./RadiologyStudyTable";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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

interface DiagnosticReportResultsTableProps {
  observations: DiagnosticReportObservation[];
}

// `__base` is injected by care_fe's override registry — the stock table
// component, used here to render non-radiology observations.
interface DiagnosticReportResultsTableOverrideProps extends DiagnosticReportResultsTableProps {
  __base?: ComponentType<DiagnosticReportResultsTableProps>;
}

export function DiagnosticReportResultsTableOverride({
  observations,
  __base: Base,
}: DiagnosticReportResultsTableOverrideProps) {
  const { t } = useTranslation(PLUGIN_SLUG);
  const queryClient = useQueryClient();
  const facilityId = useMemo(
    () => window.location.pathname.match(/\/facility\/([^/]+)/)?.[1],
    [],
  );
  const isServiceRequestPage = useMemo(
    () =>
      /^\/facility\/[^/]+\/(?:locations\/[^/]+\/)?service_requests\/[^/]+$/.test(
        window.location.pathname,
      ),
    [],
  );
  const urlServiceRequestId = useMemo(
    () => window.location.pathname.match(/\/service_requests\/([^/]+)/)?.[1],
    [],
  );
  const urlPatientId = useMemo(
    () => window.location.pathname.match(/\/patient\/([^/]+)\//)?.[1],
    [],
  );
  const pathDiagnosticReportId = useMemo(
    () => window.location.pathname.match(/\/diagnostic_reports\/([^/]+)/)?.[1],
    [],
  );
  const isPrintPage = useMemo(
    () => window.location.pathname.endsWith("/print"),
    [],
  );
  const pathEncounterId = useMemo(
    () => window.location.pathname.match(/\/encounter\/([^/]+)\//)?.[1],
    [],
  );
  // care_fe's EncounterProvider lets `?selectedEncounter=` override the path's
  // :encounterId when viewing a different encounter's tabs.
  const selectedEncounterParam =
    new URLSearchParams(window.location.search).get("selectedEncounter") ??
    undefined;
  const encounterId = selectedEncounterParam ?? pathEncounterId;
  const reportIdParam =
    new URLSearchParams(window.location.search).get("reportId") ?? undefined;
  const activityDefinitionParam =
    new URLSearchParams(window.location.search).get("activityDefinition") ??
    undefined;
  const resolvedDiagnosticReportId = pathDiagnosticReportId ?? reportIdParam;

  const { data: diagnosticReport } = useQuery<DiagnosticReport>({
    queryKey: ["diagnosticReport", urlPatientId, resolvedDiagnosticReportId],
    queryFn: () =>
      apis.diagnosticReport.retrieve(
        urlPatientId!,
        resolvedDiagnosticReportId!,
      ),
    enabled:
      !urlServiceRequestId && !!urlPatientId && !!resolvedDiagnosticReportId,
  });

  const { data: encounterReports } = useQuery<
    PaginatedResponse<DiagnosticReport>
  >({
    queryKey: [
      "radiologyEncounterDiagnosticReports",
      urlPatientId,
      encounterId,
      activityDefinitionParam,
    ],
    queryFn: () =>
      // No filter: only the first row matters, so limit 1. Filtered: scan
      // care_fe's own page size (LIMIT = 14) for a title match.
      apis.diagnosticReport.list(urlPatientId!, {
        encounter: encounterId!,
        limit: activityDefinitionParam ? 14 : 1,
      }),
    enabled:
      !urlServiceRequestId &&
      !resolvedDiagnosticReportId &&
      !!urlPatientId &&
      !!encounterId,
  });

  const defaultReport = useMemo(() => {
    const reports = encounterReports?.results ?? [];
    const filtered = activityDefinitionParam
      ? reports.filter(
          (report) =>
            (report.service_request as { title?: string } | null)?.title ===
            activityDefinitionParam,
        )
      : reports;
    return filtered[0];
  }, [encounterReports, activityDefinitionParam]);

  const serviceRequestId =
    urlServiceRequestId ??
    diagnosticReport?.service_request?.id ??
    defaultReport?.service_request?.id;

  const { data: serviceRequestDetail, isLoading: loadingServiceRequest } =
    useServiceRequestDetail(facilityId, serviceRequestId);

  const { data: studies } = useRadiologyStudies(serviceRequestId);

  const [saveTemplateFor, setSaveTemplateFor] =
    useState<DiagnosticReportObservation | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<FieldRow[]>([]);

  const createTemplateMutation = useMutation({
    mutationFn: apis.observationTemplate.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["observationTemplates"] });
      queryClient.invalidateQueries({
        queryKey: ["radiologyObservationTemplates"],
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

  const { radiologyObservations, restObservations } = useMemo(() => {
    const radiology: DiagnosticReportObservation[] = [];
    const rest: DiagnosticReportObservation[] = [];
    for (const observation of observations ?? []) {
      if (
        observation.observation_definition?.category ===
        DIAGNOSTIC_REPORT_RESULTS_OVERRIDE_CATEGORY
      ) {
        radiology.push(observation);
      } else {
        rest.push(observation);
      }
    }
    return { radiologyObservations: radiology, restObservations: rest };
  }, [observations]);

  if (!observations?.length) {
    return null;
  }

  const activityDefinitionId = serviceRequestDetail?.activity_definition?.id;

  const openSaveTemplate = (observation: DiagnosticReportObservation) => {
    if (!activityDefinitionId) {
      toast.error(t("radiology_no_activity_definition_for_service_request"));
      return;
    }
    setSaveTemplateFor(observation);
    setTitle("");
    setDescription("");
    setFields(fieldRowsFromObservation(observation));
  };

  const saveTemplate = () => {
    if (!saveTemplateFor?.observation_definition?.id || !facilityId) return;
    if (!title.trim()) {
      toast.warning(t("radiology_please_enter_template_title"));
      return;
    }
    if (!activityDefinitionId) {
      toast.error(t("radiology_no_activity_definition_for_service_request"));
      return;
    }
    createTemplateMutation.mutate({
      facility: facilityId,
      observation_definition: saveTemplateFor.observation_definition.id,
      activity_definition: activityDefinitionId,
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
  };

  const patientId =
    serviceRequestDetail?.encounter?.patient?.id ?? urlPatientId;

  return (
    <div className="space-y-4">
      {radiologyObservations.length > 0 && (
        <>
          {studies &&
            studies.length > 0 &&
            (isPrintPage ? (
              <RadiologyStudyTable
                studies={studies}
                patientId={patientId}
                hideViewReport
                hideActions
              />
            ) : (
              <Accordion
                type="single"
                collapsible
                className="rounded-lg border border-gray-200 bg-white"
              >
                <AccordionItem value="studies" className="border-b-0">
                  <AccordionTrigger className="px-3 py-2 text-sm font-medium text-gray-700 hover:no-underline">
                    {t("radiology_view_studies")}
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pt-1">
                    <RadiologyStudyTable
                      studies={studies}
                      patientId={patientId}
                      hideViewReport
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ))}

          {radiologyObservations.map((observation) => {
            const hasComponents =
              observation.component && observation.component.length > 0;

            return (
              <div
                key={observation.id}
                className="space-y-4 mb-8 rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <span className="w-full min-w-0 truncate text-sm font-medium text-gray-700 sm:w-auto">
                    {observation.observation_definition?.title ||
                      observation.observation_definition?.code?.display}
                  </span>
                  {isServiceRequestPage &&
                    facilityId &&
                    observation.observation_definition?.id && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full shrink-0 sm:w-auto"
                        disabled={loadingServiceRequest}
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
        </>
      )}

      {restObservations.length > 0 && Base && (
        <Base observations={restObservations} />
      )}

      <Dialog
        open={!!saveTemplateFor}
        onOpenChange={(open) => !open && setSaveTemplateFor(null)}
      >
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
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

export default DiagnosticReportResultsTableOverride;

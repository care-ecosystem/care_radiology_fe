import { FC, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import RadiologyStudyTable from "./RadiologyStudyTable";
import DicomUploader from "./DicomUploader";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@radix-ui/react-label";
import { PlugConfigMeta } from "@/types/plugin";
import { apis } from "@/apis";
import { useServiceRequestDetail } from "@/hooks/useServiceRequestDetail";
import { useRadiologyStudies } from "@/hooks/useRadiologyStudies";
import { useHostSiblingsHidden } from "@/hooks/useHostSiblingsHidden";
import { useRadiologyPermissions } from "@/hooks/useRadiologyPermissions";
import { allowsDiagnosticReportWithoutActiveStudy } from "@/utils/pluginConfig";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { PLUGIN_SLUG, SERVICE_REQUEST_OVERRIDE_CATEGORY } from "@/constants";
import { Plus } from "lucide-react";
import { toast } from "@/lib/utils";

type SRProps = {
  serviceRequestId: string;
  __meta?: PlugConfigMeta;
};

export const ServiceRequestView: FC<SRProps> = ({
  serviceRequestId,
  __meta,
}) => {
  const { t } = useTranslation(PLUGIN_SLUG);
  const queryClient = useQueryClient();
  const [showUploader, setShowUploader] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const facilityId = useMemo(() => {
    const match = window.location.pathname.match(/\/facility\/([^/]+)/);
    return match?.[1];
  }, []);

  const {
    canReadRadiology,
    canWriteRadiology,
    isLoading: isPermissionLoading,
    isError: isPermissionError,
  } = useRadiologyPermissions(facilityId);

  const {
    data: dicomStudies,
    isSuccess: studiesLoaded,
    isError: studiesLoadFailed,
  } = useRadiologyStudies(serviceRequestId);

  useEffect(() => {
    if (studiesLoadFailed) {
      toast.error(t("radiology_failed_to_load_studies"));
    }
  }, [studiesLoadFailed, t]);

  const { data: serviceRequestDetail } = useServiceRequestDetail(
    facilityId,
    serviceRequestId,
  );

  const isRadiologyRequest =
    serviceRequestDetail?.category === SERVICE_REQUEST_OVERRIDE_CATEGORY;

  const { data: radiologyServiceRequest } = useQuery({
    queryKey: ["radiologyServiceRequest", serviceRequestId],
    queryFn: () => apis.radiologyServiceRequest.retrieve(serviceRequestId),
    enabled: isRadiologyRequest,
  });

  const hasDiagnosticReports =
    (serviceRequestDetail?.diagnostic_reports?.length ?? 0) > 0;
  const hasActiveStudy = (dicomStudies ?? []).some(
    (study) => !study.is_archived,
  );
  const isServiceRequestActive = serviceRequestDetail?.status === "active";

  const isUploadStage = isServiceRequestActive && !hasDiagnosticReports;

  useEffect(() => {
    if (!isPermissionLoading && isRadiologyRequest && !canReadRadiology) {
      toast.error(
        t(
          isPermissionError
            ? "radiology_permission_check_failed"
            : "radiology_no_permission",
        ),
      );
    }
  }, [
    isPermissionLoading,
    isPermissionError,
    isRadiologyRequest,
    canReadRadiology,
    t,
  ]);

  const blockReportCreation =
    isRadiologyRequest &&
    studiesLoaded &&
    !hasDiagnosticReports &&
    !hasActiveStudy &&
    !allowsDiagnosticReportWithoutActiveStudy(__meta);

  useHostSiblingsHidden(rootRef, blockReportCreation);

  const hasStudies = (dicomStudies?.length ?? 0) > 0;
  const isNonRadiologyRequest =
    !!serviceRequestDetail && !isRadiologyRequest;
  if (
    !(canReadRadiology || canWriteRadiology) ||
    isNonRadiologyRequest ||
    (!serviceRequestDetail && !hasStudies)
  ) {
    return null;
  }

  const patientId = serviceRequestDetail?.encounter?.patient?.id;
  const canUploadDicom =
    canWriteRadiology && isUploadStage && (studiesLoaded || !canReadRadiology);

  const invalidateServiceRequestQueries = () => {
    queryClient.invalidateQueries({
      queryKey: ["dicomStudies", serviceRequestId],
    });
  };

  const handleUploaderClose = () => {
    setShowUploader(false);
  };

  return (
    <div ref={rootRef}>
      {hasStudies && (
        <Card className="mb-4 shadow-none rounded-lg border-gray-200 bg-gray-50">
          <CardContent className="p-4">
            <div className="grid gap-4 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-base font-semibold text-gray-950">
                  {t("radiology_studies")}
                </Label>
                {canUploadDicom && (
                  <Button
                    variant="primary"
                    className="shrink-0"
                    onClick={() => setShowUploader(true)}
                  >
                    <Plus className="size-4 mr-1" />
                    {t("dicom_upload_data")}
                  </Button>
                )}
              </div>
              <RadiologyStudyTable
                studies={dicomStudies}
                canArchive={canUploadDicom}
                onArchived={invalidateServiceRequestQueries}
                patientId={patientId}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {
        canUploadDicom && !hasStudies && (
          <Card className="mb-4 shadow-none rounded-lg border-gray-200 bg-gray-50">
            <CardContent className="p-8">
              <div className="flex flex-col gap-4 items-center">
                <div className="text-center">
                  <Label className="text-base font-semibold text-gray-950">
                    {t("dicom_upload_files_heading")}
                  </Label>
                  {canReadRadiology && (
                    <p className="mt-2 text-sm text-gray-500">
                      {t("service_request_dicom_no_studies_found")}
                    </p>
                  )}
                </div>
                <div className="flex justify-center">
                  <Button
                    variant="primary"
                    onClick={() => setShowUploader(true)}
                  >
                    <Plus className="size-4 mr-1" />
                      {t("dicom_upload_data")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      }

      {blockReportCreation && (
        <Card className="mb-4 shadow-none rounded-lg border-gray-200 bg-gray-50">
          <CardContent className="flex items-start gap-3 p-4">
            <p className="text-sm text-gray-700">
              {t("radiology_report_needs_active_study")}
            </p>
          </CardContent>
        </Card>
      )}

      {canUploadDicom && facilityId && patientId && (
        <Dialog
          open={showUploader}
          onOpenChange={(open) => !open && handleUploaderClose()}
        >
          <DialogContent
            className="max-w-[calc(100%-2rem)] sm:max-w-4xl max-h-[90vh] overflow-auto gap-0 p-0"
            hideCloseButton
          >
            <DicomUploader
              patientId={patientId}
              facilityId={facilityId}
              serviceRequestId={serviceRequestId}
              accessionNumber={radiologyServiceRequest?.accession_number}
              onClose={handleUploaderClose}
              onUploadSuccess={invalidateServiceRequestQueries}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ServiceRequestView;

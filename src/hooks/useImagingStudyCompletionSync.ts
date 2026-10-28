import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apis } from "@/apis";
import { ImagingStudy } from "@/types/imagingStudy";
import { PLUGIN_SLUG, SERVICE_REQUEST_OVERRIDE_CATEGORY } from "@/constants";
import { imagingStudyQueryKey } from "@/hooks/useRadiologyStudies";
import { ServiceRequest } from "@/types/serviceRequest";
import { toast } from "@/lib/utils";

//  Marks the imaging study COMPLETED once its service request is completed.

export function useImagingStudyCompletionSync({
  serviceRequest,
  imagingStudy,
  canWriteRadiology,
}: {
  serviceRequest?: ServiceRequest;
  imagingStudy?: ImagingStudy | null;
  canWriteRadiology: boolean;
}) {
  const { t } = useTranslation(PLUGIN_SLUG);
  const queryClient = useQueryClient();
  const attemptedFor = useRef<string | null>(null);

  const serviceRequestId = serviceRequest?.id;
  const patientId = serviceRequest?.encounter?.patient?.id;
  const shouldComplete =
    canWriteRadiology &&
    serviceRequest?.category === SERVICE_REQUEST_OVERRIDE_CATEGORY &&
    serviceRequest?.status === "completed" &&
    !!imagingStudy &&
    imagingStudy.status !== "COMPLETED" &&
    imagingStudy.status !== "CANCELLED";

  useEffect(() => {
    if (!shouldComplete || !patientId || !serviceRequestId) return;
    if (attemptedFor.current === serviceRequestId) return;
    attemptedFor.current = serviceRequestId;

    apis.imagingStudy
      .updateStatus(patientId, serviceRequestId, { status: "COMPLETED" })
      .then(() =>
        queryClient.invalidateQueries({
          queryKey: imagingStudyQueryKey(patientId, serviceRequestId),
        }),
      )
      .catch(() => toast.error(t("imaging_study_complete_failed")));
  }, [shouldComplete, patientId, serviceRequestId, queryClient, t]);
}

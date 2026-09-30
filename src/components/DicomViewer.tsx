import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { PLUGIN_SLUG } from "@/constants";
import { getPluginMeta } from "@/utils/pluginConfig";
import { useServiceRequestDetail } from "@/hooks/useServiceRequestDetail";
import { useRadiologyPermissions } from "@/hooks/useRadiologyPermissions";
import { toast } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { useRadiologyStudies } from "@/hooks/useRadiologyStudies";

export default function DicomViewer({
  facilityId,
  serviceRequestId,
  studyUid,
  seriesUid,
  instanceUid,
}: {
  facilityId?: string;
  serviceRequestId?: string;
  studyUid: string;
  seriesUid?: string;
  instanceUid?: string;
}) {
  const dicomViewerRef = useRef<HTMLIFrameElement>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const { t } = useTranslation(PLUGIN_SLUG);
  const {
    canReadRadiology,
    isLoading: isPermissionLoading,
    isError: isPermissionError,
  } = useRadiologyPermissions(facilityId);

  useEffect(() => {
    if (canReadRadiology || isPermissionLoading) return;
    toast.error(
      t(
        isPermissionError
          ? "radiology_permission_check_failed"
          : "radiology_no_permission",
      ),
    );
  }, [isPermissionLoading, isPermissionError, canReadRadiology, t]);

  const { data: studies } = useRadiologyStudies(serviceRequestId, false);

  const { data: serviceRequestDetail } = useServiceRequestDetail(
    facilityId,
    serviceRequestId,
  );

  const studyDate = useMemo(
    () => studies?.find((s) => s.study_uid === studyUid)?.study_date,
    [studies, studyUid],
  );
  const serviceRequestName = serviceRequestDetail?.title as string | undefined;

  const queryClient = useQueryClient();
  useEffect(() => {
    if (!canReadRadiology) return;
    queryClient
      .ensureQueryData({ queryKey: ["user-refresh-token"] })
      .then((val) => {
        const token = (val as { access: string; refresh: string }).access;

        const ohifBaseUrl = `${ getPluginMeta()?.radiologyViewerBaseUrl || "" }`;
        if (studyUid && seriesUid && instanceUid) {
          setIframeUrl(
            `${ohifBaseUrl}/viewer?StudyInstanceUIDs=${studyUid}&initialSeriesInstanceUID=${seriesUid}&initialSopInstanceUID=${instanceUid}&token=${token}`
          );
        } else {
          setIframeUrl(
            `${ohifBaseUrl}/viewer?StudyInstanceUIDs=${studyUid}&token=${token}`
          );
        }
      });
  }, [queryClient, canReadRadiology]);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  useEffect(() => {
    if (!isPseudoFullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsPseudoFullscreen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isPseudoFullscreen]);

  const goFullscreen = (ref: RefObject<HTMLIFrameElement>) => {
    const el = ref.current as
      | (HTMLIFrameElement & { webkitRequestFullscreen?: () => void })
      | null;
    if (!el) return;
    (el.requestFullscreen ?? el.webkitRequestFullscreen)?.call(el);
  };

  if (!canReadRadiology && isPermissionError) {
    return (
      <div id="dicom-viewer-page">
        <EmptyState
          className="flex-1 m-4"
          title={t("radiology_permission_check_failed_title")}
          description={t("radiology_permission_check_failed_description")}
        />
      </div>
    );
  }

  if (!isPermissionLoading && !canReadRadiology) {
    return (
      <div id="dicom-viewer-page">
        <EmptyState
          className="flex-1 m-4"
          title={t("radiology_no_access_title")}
          description={t("radiology_no_access_description")}
        />
      </div>
    );
  }

  if (!iframeUrl) return <div>{t("radiology_please_wait")}</div>;

  return (
    <div
      id="dicom-viewer-page"
      className={`flex flex-col bg-white rounded-lg overflow-hidden ${
        isPseudoFullscreen ? "fixed inset-0 z-50 rounded-none" : ""
      }`}
    >
      {!isPseudoFullscreen && (
        <div className="flex flex-col items-stretch gap-2 px-4 py-3 border-b border-gray-200 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-xl font-semibold text-gray-800 break-words">
              {serviceRequestName
                ? `${t("dicom_study_viewer")} (${serviceRequestName})`
                : t("dicom_study_viewer")}
            </span>
            {studyDate && (
              <span className="text-sm text-gray-500">
                {format(studyDate, "dd/MM/yyyy, hh:mm a")}
              </span>
            )}
          </div>
          <div className="flex gap-2 sm:justify-end sm:gap-5">
            <Button
              variant={"primary"}
              className="flex-1 sm:flex-none"
              onClick={() => {
                if (isIOS) {
                  setIsPseudoFullscreen((prev) => !prev);
                } else {
                  goFullscreen(dicomViewerRef as RefObject<HTMLIFrameElement>);
                }
              }}
            >
              {t("radiology_fullscreen")}
            </Button>
            <Button
              variant={"outline"}
              color={"red"}
              className="flex-1 sm:flex-none"
              onClick={() => window.close()}
            >
              {t("radiology_close")}
            </Button>
          </div>
        </div>
      )}
      <div className="flex-1 min-h-0 p-0 sm:p-4 relative">
        <iframe
          ref={dicomViewerRef}
          className="w-full h-full rounded-none border border-gray-200 sm:rounded-lg"
          src={iframeUrl}
        ></iframe>
      </div>
    </div>
  );
}

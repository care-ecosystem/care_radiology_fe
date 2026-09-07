import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { PLUGIN_SLUG } from "@/constants";
import { PlugConfigMeta } from "@/types/plugin";
import { apis } from "@/apis";
import { RadiologyServiceRequest } from "@/types/serviceRequest";

export default function DicomViewer({
  serviceRequestId,
  studyUid,
  seriesUid,
  instanceUid,
}: {
  serviceRequestId?: string;
  studyUid: string;
  seriesUid?: string;
  instanceUid?: string;
}) {
  const dicomViewerRef = useRef<HTMLIFrameElement>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const { t } = useTranslation(PLUGIN_SLUG);

  const { data: radiologyServiceRequests } = useQuery<RadiologyServiceRequest[]>({
    queryKey: ["radiologyservicerequest", serviceRequestId],
    queryFn: () => apis.servicerequest.fetch({ serviceRequestId: serviceRequestId! }),
    enabled: !!serviceRequestId,
  });

  const { serviceRequestName, studyDate } = useMemo(() => {
    const match = radiologyServiceRequests?.find(
      (rsr) => rsr.dicom_study?.study_uid === studyUid,
    );
    return {
      serviceRequestName: match?.service_request?.title as string | undefined,
      studyDate: match?.dicom_study?.study_date,
    };
  }, [radiologyServiceRequests, studyUid]);

  const queryClient = useQueryClient();
  useEffect(() => {
    queryClient
      .ensureQueryData({ queryKey: ["user-refresh-token"] })
      .then((val) => {
        const token = (val as { access: string; refresh: string }).access;

        const meta = window.__CARE_PLUGIN_RUNTIME__?.meta[PLUGIN_SLUG] as PlugConfigMeta;
        const ohifBaseUrl = `${ meta?.radiologyViewerBaseUrl || "" }`;
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
  }, [queryClient]);

  const goFullscreen = (ref: RefObject<HTMLIFrameElement>) => {
    if (ref.current) ref.current.requestFullscreen();
  };

  if (!iframeUrl) return <div>{t("radiology_please_wait")}</div>;

  return (
    <div id="dicom-viewer-page" className="flex flex-col bg-white rounded-lg overflow-hidden">
      <div className="flex flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex flex-col gap-0.5">
          <span className="text-xl font-semibold text-gray-800">
            {serviceRequestName
              ? `${t("dicom_study_viewer")} (${serviceRequestName})`
              : t("dicom_study_viewer")}
          </span>
          <span className="text-sm text-gray-500">
            {studyDate && format(studyDate, "dd/MM/yyyy, hh:mm a")}
          </span>
        </div>
        <div className="flex gap-5 justify-end">
          <Button
            variant={"primary"}
            onClick={() => {
              goFullscreen(dicomViewerRef as RefObject<HTMLIFrameElement>);
            }}
          >
            {t("radiology_fullscreen")}
          </Button>
          <Button
            variant={"outline"}
            color={"red"}
            onClick={() => window.close()}
          >
            {t("radiology_close")}
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0 p-4">
        <iframe
          ref={dicomViewerRef}
          className="w-full h-full rounded-lg border border-gray-200"
          src={iframeUrl}
        ></iframe>
      </div>
    </div>
  );
}

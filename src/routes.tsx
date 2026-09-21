import { lazy } from "react";

import DicomViewer from "@/components/DicomViewer";

const ObservationTemplateSettings = lazy(
  () => import("@/pages/ObservationTemplateSettings"),
);

const routes = {
  "/facility/:facilityId/service_requests/:serviceRequestId/radiology/view/:studyid":
    ({
      facilityId,
      serviceRequestId,
      studyid,
    }: {
      facilityId: string;
      serviceRequestId: string;
      studyid: string;
    }) => (
      <DicomViewer
        facilityId={facilityId}
        serviceRequestId={serviceRequestId}
        studyUid={studyid}
      ></DicomViewer>
    ),

  "/facility/:facilityId/settings/general/report_templates": ({
    facilityId,
  }: {
    facilityId: string;
  }) => <ObservationTemplateSettings facilityId={facilityId} />,
};

export default routes;

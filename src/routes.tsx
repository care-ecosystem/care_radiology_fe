import { lazy } from "react";

import DicomViewer from "@/components/DicomViewer";

const ObservationTemplateSettings = lazy(
  () => import("@/pages/ObservationTemplateSettings"),
);

const routes = {
  "/facility/:facilityId/patient/:patientId/encounter/:encounterId/radiology/view/:studyid":
    ({
      facilityId,
      patientId,
      encounterId,
      studyid,
    }: {
      facilityId: string;
      patientId: string;
      encounterId: string;
      studyid: string;
    }) => (
      <DicomViewer
        facilityId={facilityId}
        patientId={patientId}
        encounterId={encounterId}
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

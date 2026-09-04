import DicomUploader from "./components/DicomUploader";
import DicomViewer from "./components/DicomViewer";

const routes = {
  // willberemovedlater
  "/facility/:facilityId/patient/:patientId/service_requests/:serviceRequestId/radiology/uploader":
    ({
      facilityId,
      patientId,
      serviceRequestId,
    }: {
      facilityId: string;
      patientId: string;
      serviceRequestId: string;
    }) => (
      <DicomUploader
        facilityId={facilityId}
        patientId={patientId}
        serviceRequestId={serviceRequestId}
      ></DicomUploader>
    ),
  // willberemovedlater
  "/facility/:facilityId/service_requests/:serviceRequestId/radiology/view/:studyid":
    ({
      serviceRequestId,
      studyid,
    }: {
      serviceRequestId: string;
      studyid: string;
    }) => (
      <DicomViewer
        serviceRequestId={serviceRequestId}
        studyUid={studyid}
      ></DicomViewer>
    ),
};

export default routes;

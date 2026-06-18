import DicomUploader from "./components/DicomUploader";
import DicomViewer from "./components/DicomViewer";
import DicomReport from "./components/DicomReport";
import StudyReportPreview from "./components/Study/StudyReportPreview";

const routes = {
  "/facility/:facilityId/patient/:patientId/service_requests/:serviceRequestId/radiology/uploader":
    ({
      facilityId,
      patientId,
      serviceRequestId
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
  "/facility/:facilityId/service_requests/:serviceRequestId/radiology/view/:studyid":
    ({ studyid }: { studyid: string }) => (
      <DicomViewer studyUid={studyid}></DicomViewer>
    ),
  "/facility/:facilityId/service_requests/:serviceRequestId/radiology/report/:studyid":
    ({ 
      facilityId,
      serviceRequestId, 
      studyid 
    }: { 
      facilityId: string;
      serviceRequestId: string;
      studyid: string;
    }) => (
      <DicomReport 
        facilityId={facilityId} 
        serviceRequestId={serviceRequestId}
        studyUid={studyid}
      ></DicomReport>
    ),
  "/facility/:facilityId/service_requests/:serviceRequestId/radiology/report/:studyid/preview":
    ({ studyid }: { studyid: string }) => (
      <StudyReportPreview studyUid={studyid}></StudyReportPreview>
    ),
  /* "/facility/:facilityId/services_requests/radiology/view/:studyid": (
      { studyid }: { studyid: string }
    ) => (
      <DicomViewer studyUid={studyid}></DicomViewer>
    ), */
};

export default routes;

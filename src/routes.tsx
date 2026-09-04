import DicomViewer from "./components/DicomViewer";

const routes = {
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

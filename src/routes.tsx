import DicomViewer from "@/components/DicomViewer";

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
};

export default routes;

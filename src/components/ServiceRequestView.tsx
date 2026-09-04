import React, { FC, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apis } from "@/apis";
import RadiologyStudyTable from "./RadiologyStudyTable";
import DicomUploader from "./DicomUploader";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@radix-ui/react-label";
import { RadiologyServiceRequest, ServiceRequest } from "@/types/serviceRequest";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { PLUGIN_SLUG, SERVICE_REQUEST_OVERRIDE_CATEGORY } from "@/constants";
import { Plus } from "lucide-react";

type SRProps = {
  serviceRequestId: string;
};

export const ServiceRequestView: FC<SRProps> = ({ serviceRequestId }) => {
  const { t } = useTranslation(PLUGIN_SLUG);
  const queryClient = useQueryClient();
  const [showUploader, setShowUploader] = useState(false);

  const { data: radiologyServiceRequests } = useQuery<
    RadiologyServiceRequest[]
  >({
    queryKey: ["radiologyservicerequest", serviceRequestId],
    queryFn: () =>
      apis.servicerequest.fetch({
        serviceRequestId,
      }),
    enabled: !!serviceRequestId,
  });
  
  const dicomStudies = useMemo(
    () =>
      radiologyServiceRequests?.map((rsr) => rsr.dicom_study).filter(Boolean),
    [radiologyServiceRequests],
  );

  const facilityId = useMemo(() => {
    const match = window.location.pathname.match(/\/facility\/([^/]+)/);
    return match?.[1];
  }, []);
  
  const { data: serviceRequestDetail } = useQuery<ServiceRequest>({
    queryKey: ["serviceRequestDetail", facilityId, serviceRequestId],
    queryFn: () => apis.servicerequest.retrieve(facilityId!, serviceRequestId),
    enabled: !!facilityId && !!serviceRequestId,
  });

  if (serviceRequestDetail?.category !== SERVICE_REQUEST_OVERRIDE_CATEGORY) {
    return null;
  }

  const patientId = serviceRequestDetail?.encounter?.patient?.id;

  const invalidateServiceRequestQueries = () => {
    queryClient.invalidateQueries({
      queryKey: ["radiologyservicerequest", serviceRequestId],
    });
  };

  const handleUploaderClose = () => {
    setShowUploader(false);
  };

  return (
    <React.Fragment>
      {dicomStudies && dicomStudies.length > 0 && (
        <Card className="mb-4 shadow-none rounded-lg border-gray-200 bg-gray-50">
          <CardContent className="p-4">
            <div className="grid gap-4">
              <div className="flex justify-between items-start">
                <Label className="text-base font-semibold text-gray-950">
                  {t("radiology_studies")}
                </Label>
                <Button
                  variant="primary"
                  onClick={() => setShowUploader(true)}
                >
                  <Plus className="size-4 mr-1" />
                  {t("dicom_upload_data")}
                </Button>
              </div>
              <RadiologyStudyTable studies={dicomStudies} />
            </div>
          </CardContent>
        </Card>
      )}

      {
        (dicomStudies === undefined || dicomStudies.length == 0) && (
          <Card className="mb-4 shadow-none rounded-lg border-gray-200 bg-gray-50">
            <CardContent className="p-8">
              <div className="flex flex-col gap-4 items-center">
                <div className="text-center">
                  <Label className="text-base font-semibold text-gray-950">
                    {t("dicom_upload_files_heading")}
                  </Label>
                  <p className="mt-2 text-sm text-gray-500">
                    {t("service_request_dicom_no_studies_found")}
                  </p>
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

      {facilityId && patientId && (
        <Dialog
          open={showUploader}
          onOpenChange={(open) => !open && handleUploaderClose()}
        >
          <DialogContent
            className="max-w-4xl max-h-[95vh] overflow-auto gap-0 p-0"
            hideCloseButton
          >
            <DicomUploader
              patientId={patientId}
              serviceRequestId={serviceRequestId}
              onClose={handleUploaderClose}
              onUploadSuccess={invalidateServiceRequestQueries}
            />
          </DialogContent>
        </Dialog>
      )}
    </React.Fragment>
  );
};

export default ServiceRequestView;

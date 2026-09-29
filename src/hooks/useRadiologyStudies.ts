import { useQuery } from "@tanstack/react-query";
import { apis } from "@/apis";
import { DicomStudy } from "@/types/dicom";

export function useRadiologyStudies(
  serviceRequestId?: string,
  includeArchived = true,
) {
  return useQuery<DicomStudy[]>({
    queryKey: ["radiologyservicerequest", serviceRequestId, includeArchived],
    queryFn: () =>
      apis.dicom.fetchStudies({
        serviceRequestId: serviceRequestId!,
        includeArchived,
      }),
    enabled: !!serviceRequestId,
  });
}

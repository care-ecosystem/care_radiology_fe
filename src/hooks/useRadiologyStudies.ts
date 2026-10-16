import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apis } from "@/apis";
import { APIError } from "@/apis/request";
import { DicomStudy } from "@/types/dicom";
import { ImagingStudy } from "@/types/imagingStudy";

export const imagingStudyQueryKey = (
  patientId?: string,
  serviceRequestId?: string,
) => ["imagingStudy", patientId, serviceRequestId];

// Study rows link to their service request and report, which the API only
// sends once on the parent ImagingStudy.
export const toDicomStudies = (
  imagingStudy: ImagingStudy | null,
): DicomStudy[] => {
  if (!imagingStudy) return [];
  const serviceRequest = imagingStudy.service_request;
  return imagingStudy.studies.map((study) => ({
    ...study,
    service_request: serviceRequest
      ? {
          id: serviceRequest.id,
          diagnostic_report_id:
            serviceRequest.diagnostic_reports?.[0]?.id ?? null,
        }
      : null,
  }));
};

// Resolves to null when the service request has no ImagingStudy yet (older
// requests get one on their first upload).
export function useImagingStudy(
  patientId?: string,
  serviceRequestId?: string,
  includeArchived = true,
) {
  return useQuery<ImagingStudy | null>({
    queryKey: [
      ...imagingStudyQueryKey(patientId, serviceRequestId),
      includeArchived,
    ],
    queryFn: async () => {
      try {
        return await apis.imagingStudy.retrieve(patientId!, serviceRequestId!, {
          include_archived: includeArchived,
        });
      } catch (error) {
        if (error instanceof APIError && error.status === 404) return null;
        throw error;
      }
    },
    enabled: !!patientId && !!serviceRequestId,
  });
}

export function useRadiologyStudies(
  patientId?: string,
  serviceRequestId?: string,
  includeArchived = true,
) {
  const query = useImagingStudy(patientId, serviceRequestId, includeArchived);
  const data = useMemo(
    () => (query.data === undefined ? undefined : toDicomStudies(query.data)),
    [query.data],
  );
  return { ...query, data, imagingStudy: query.data };
}

import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apis } from "@/apis";
import { APIError } from "@/apis/request";
import { PaginatedResponse } from "@/apis/types";
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
    encounter_id: imagingStudy.encounter?.id,
    accession_number: imagingStudy.accession_number,
    service_request: serviceRequest
      ? {
          id: serviceRequest.id,
          diagnostic_report_id:
            serviceRequest.diagnostic_reports?.[0]?.id ?? null,
        }
      : null,
  }));
};

const ENCOUNTER_IMAGING_STUDY_LIMIT = 100;

export const encounterImagingStudiesQueryKey = (
  patientId?: string,
  encounterId?: string,
) => ["imagingStudies", patientId, encounterId];

export function useEncounterImagingStudies(
  patientId?: string,
  encounterId?: string,
  {
    enabled = true,
    limit = ENCOUNTER_IMAGING_STUDY_LIMIT,
    offset = 0,
  }: { enabled?: boolean; limit?: number; offset?: number } = {},
) {
  return useQuery<PaginatedResponse<ImagingStudy>>({
    queryKey: [
      ...encounterImagingStudiesQueryKey(patientId, encounterId),
      limit,
      offset,
    ],
    queryFn: () =>
      apis.imagingStudy.list(patientId!, {
        encounter: encounterId!,
        limit,
        offset,
      }),
    enabled: enabled && !!patientId && !!encounterId,
    placeholderData: keepPreviousData,
  });
}

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

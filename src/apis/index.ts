import { queryString, request } from "./request";
import { PaginatedResponse } from "./types";
import { DicomStudyArchiveResponse } from "@/types/dicom";
import {
  ObservationTemplate,
  ObservationTemplateField,
} from "@/types/observationTemplate";
import {
  ActivityDefinitionDetail,
  ActivityDefinitionListItem,
} from "@/types/activityDefinition";

export const apis = {
  dicom: {
    fetchStudies: async (query?: {
      encounter?: string;
      serviceRequestId?: string;
      includeArchived?: boolean;
    }) => {
      const params: Record<string, string> = {};
      if (query?.serviceRequestId) params.serviceRequestId = query.serviceRequestId;
      else if (query?.encounter) params.encounterId = query.encounter;
      params.includeArchived = String(query?.includeArchived ?? false);
      return await request<any>(
        `/api/care_radiology/dicom/studies/${queryString(params)}`,
      );
    },

    upload: async (payload: FormData): Promise<DicomUploadResponse> => {
      return await request<DicomUploadResponse>(
        "/api/care_radiology/dicom/upload/",
        {
          body: payload,
          method: "POST",
        },
        {
          isFormdata: true,
        },
      );
    },

    archive: async (
      id: string,
      payload: { archive_reason: string },
    ): Promise<DicomStudyArchiveResponse> => {
      return await request<DicomStudyArchiveResponse>(
        `/api/care_radiology/dicom/${id}/archive/`,
        {
          body: JSON.stringify(payload),
          method: "POST",
        },
      );
    },
  },

  servicerequest: {
    retrieve: async (facilityId: string, serviceRequestId: string) => {
      return await request<any>(
        `/api/v1/facility/${facilityId}/service_request/${serviceRequestId}/`,
        { method: "GET" },
      );
    },
  },

  observationTemplate: {
    fetchAll: async (query: {
      facility: string;
      observation_definition: string;
      activity_definition?: string;
      title?: string;
      limit?: number;
      offset?: number;
    }): Promise<PaginatedResponse<ObservationTemplate>> => {
      const params: Record<string, string | number> = {
        facility: query.facility,
        observation_definition: query.observation_definition,
      };
      if (query.activity_definition) {
        params.activity_definition = query.activity_definition;
      }
      if (query.title) {
        params.title = encodeURIComponent(query.title);
      }
      if (query.limit) {
        params.limit = query.limit;
      }
      if (query.offset) {
        params.offset = query.offset;
      }
      return await request<PaginatedResponse<ObservationTemplate>>(
        `/api/care_radiology/observation_template/${queryString(params)}`,
      );
    },

    create: async (payload: {
      facility: string;
      observation_definition: string;
      activity_definition: string;
      title: string;
      description?: string;
      fields: ObservationTemplateField[];
    }): Promise<ObservationTemplate> => {
      return await request<ObservationTemplate>(
        "/api/care_radiology/observation_template/",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
    },

    update: async (
      id: string,
      payload: { facility: string; title: string; description?: string },
    ): Promise<ObservationTemplate> => {
      return await request<ObservationTemplate>(
        `/api/care_radiology/observation_template/${id}/${queryString({
          facility: payload.facility,
        })}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );
    },
  },

  activityDefinition: {
    // Only `imaging` activity definitions are relevant to the radiology plug.
    list: async (query: {
      facility: string;
      title?: string;
      limit?: number;
    }): Promise<PaginatedResponse<ActivityDefinitionListItem>> => {
      const params: Record<string, string | number> = {
        classification: "imaging",
        status: "active",
        limit: query.limit ?? 20,
      };
      if (query.title) {
        params.title = encodeURIComponent(query.title);
      }
      return await request<PaginatedResponse<ActivityDefinitionListItem>>(
        `/api/v1/facility/${query.facility}/activity_definition/${queryString(
          params,
        )}`,
      );
    },

    // The list spec omits `observation_result_requirements`; only retrieve has it.
    retrieve: async (
      facilityId: string,
      slug: string,
    ): Promise<ActivityDefinitionDetail> => {
      return await request<ActivityDefinitionDetail>(
        `/api/v1/facility/${facilityId}/activity_definition/${slug}/`,
      );
    },
  },
};

interface DicomUploadResponse {
  message: string;
  study_uid: string;
}

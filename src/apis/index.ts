import { queryString, request } from "./request";
import { PaginatedResponse } from "./types";
import {
  ObservationTemplate,
  ObservationTemplateField,
} from "@/types/observationTemplate";

export const apis = {
  dicom: {
    fetchStudies: async (query?: {
      facility?: string;
      patient?: string;
      encounter?: string;
      ordering?: string;
    }) => {
      return await request<any>(
        `/api/care_radiology/dicom/studies/${queryString({
          patientId: query?.patient ?? "",
          encounterId: query?.encounter ?? "",
        })}`,
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

    linkServiceRequest: async (payload: {
      study_uid: string;
      service_request_id: string;
    }): Promise<unknown> => {
      return await request<unknown>(
        "/api/care_radiology/dicom/link-service-request/",
        {
          body: JSON.stringify(payload),
          method: "POST",
        },
      );
    },
  },

  servicerequest: {
    fetch: async (query: { serviceRequestId: string }) => {
      return await request<any>(
        `/api/care_radiology/dicom/service-requests${queryString({
          serviceRequestId: query?.serviceRequestId ?? "",
        })}`,
      );
    },

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
      return await request<PaginatedResponse<ObservationTemplate>>(
        `/api/care_radiology/observation_template/${queryString(params)}`,
      );
    },

    create: async (payload: {
      facility: string;
      observation_definition: string;
      activity_definition?: string;
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
};

interface DicomUploadResponse {
  message: string;
  study_uid: string;
}

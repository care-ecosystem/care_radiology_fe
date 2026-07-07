import { queryString, request } from "./request";
import { PaginatedResponse } from "./types";
// FIXME: Move all the api specific types to a ./types.ts file
export interface Coding {
  coding_code: string;
  coding_system: string;
  coding_display: string;
}

export interface ModalityType {
  external_id: string;
  display_name: string;
  coding: Coding[];
}

export interface BodyPart {
  external_id: string;
  display_name: string;
  modality_id: string;
  modality: string; // external_id of ModalityType
  coding: Coding[];
}

export interface ScanProtocol {
  external_id: string;
  display_name: string;
  modality: string;
  body_part: string;
  coding: Coding[];
}

// FIXME: Move all the api specific types to a ./types.ts file

export const apis = {
  user: {
    getCurrent: async () => {
      return await request("/api/v1/users/getcurrentuser/", {
        method: "GET",
      });
    },
  },

  patient: {
    retrieve: async (patientId: string) => {
      return await request<any>(`/api/v1/patient/${patientId}/`, {
        method: "GET",
      });
    },
  },

  dicom: {
    fetchStudies: async (query?: {
      facility?: string;
      patient?: string;
      ordering?: string;
    }) => {
      return await request<any>(
        `/api/care_radiology/dicom/studies/${queryString({
          patientId: query?.patient ?? "",
        })}`,
      );
    },

    fetchSeries: async (query: { studyId: string }) => {
      return await request<any>(
        `/api/care_radiology/list-dicom-series/?study_id=${query.studyId}`,
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

    fetchOne: async (studyUid: string) => {
      const all = await request<any>("/api/care_radiology/list-dicom-studies/");
      return all.find((s: any) => s.id === studyUid) || null;
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

  modality: {
    // GET /api/v1/modality_type/
    fetchAll: async (): Promise<PaginatedResponse<ModalityType>> => {
      return await request<PaginatedResponse<ModalityType>>(
        "/api/care_radiology/modality_type/",
      );
    },

    // POST /api/v1/modality_type/
    create: async (payload: {
      display_name: string;
      coding: Coding[];
    }): Promise<ModalityType> => {
      return await request<ModalityType>("/api/care_radiology/modality_type/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    // PUT /api/v1/modality_type/:external_id/
    update: async (
      id: string,
      payload: Partial<{ display_name: string; coding: Coding[] }>,
    ): Promise<ModalityType> => {
      return await request<ModalityType>(
        `/api/care_radiology/modality_type/${id}/`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        },
      );
    },

    // DELETE /api/v1/modality_type/:external_id/
    remove: async (id: string): Promise<void> => {
      return await request<void>(`/api/care_radiology/modality_type/${id}/`, {
        method: "DELETE",
      });
    },
  },

  bodyPart: {
    fetchAll: async (): Promise<PaginatedResponse<BodyPart>> => {
      return await request<PaginatedResponse<BodyPart>>(
        "/api/care_radiology/body_part/",
      );
    },

    create: async (payload: {
      modality: string; // required: modality external_id
      display_name: string;
      coding: Coding[];
    }): Promise<BodyPart> => {
      return await request<BodyPart>("/api/care_radiology/body_part/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    update: async (
      id: string,
      payload: Partial<{
        modality: string;
        display_name: string;
        coding: Coding[];
      }>,
    ): Promise<BodyPart> => {
      return await request<BodyPart>(`/api/care_radiology/body_part/${id}/`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },

    remove: async (id: string): Promise<void> => {
      return await request<void>(`/api/care_radiology/body_part/${id}/`, {
        method: "DELETE",
      });
    },
  },

  scanProtocol: {
    fetchAll: async (params?: {
      modality?: string;
      body_part?: string;
    }): Promise<PaginatedResponse<ScanProtocol>> => {
      return await request<PaginatedResponse<ScanProtocol>>(
        `/api/care_radiology/scan_protocol/${queryString(params ?? {})}`,
      );
    },

    create: async (payload: {
      display_name: string;
      modality: string; // external_id
      body_part: string; // external_id
      coding: Coding[];
    }): Promise<ScanProtocol> => {
      return await request<ScanProtocol>("/api/care_radiology/scan_protocol/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    update: async (
      id: string,
      payload: Partial<{
        display_name: string;
        modality: string;
        body_part: string;
        coding: Coding[];
      }>,
    ): Promise<ScanProtocol> => {
      return await request<ScanProtocol>(
        `/api/care_radiology/scan_protocol/${id}/`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        },
      );
    },

    remove: async (id: string): Promise<void> => {
      return await request<void>(`/api/care_radiology/scan_protocol/${id}/`, {
        method: "DELETE",
      });
    },
  },

  studyReport: {
    create: async (payload: {
      study: string;
      modality: string;
      body_part: string;
      scan_protocol: string;
      technique?: string;
      findings?: string;
      impression?: string;
    }) => {
      return await request("/api/care_radiology/study_report/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    fetchByStudy: async (studyUid: string) => {
      const res: any = await request(
        `/api/care_radiology/study_report/?study=${studyUid}`,
        {
          method: "GET",
        },
      );
      return {
        ...res,
        results: res.results || [],
      };
    },

    update: async (
      reportId: string,
      payload: {
        modality: string;
        body_part: string;
        scan_protocol: string;
        technique?: string;
        findings?: string;
        impression?: string;
      },
    ) => {
      return await request(`/api/care_radiology/study_report/${reportId}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },
  },

  studyReportAudit: {
    fetchByStudyReport: async (studyReportUid: string) => {
      const res: any = await request(
        `/api/care_radiology/study-report-audits/?study_report=${studyReportUid}`,
        {
          method: "GET",
        },
      );
      return {
        ...res,
        results: res.results || [],
      };
    },
  },

  valueset: {
    expand: async (slug: string, search: string, count = 10) => {
      return await request<{
        results: { code: string; display: string; system: string }[];
      }>(`/api/v1/valueset/${slug}/expand/`, {
        method: "POST",
        body: JSON.stringify({ count, search }),
      });
    },
  },

  template: {
    create: async (payload: {
      modality: string;
      body_part: string;
      scan_protocol: string;
      technique?: string;
      findings?: string;
      impression?: string;
    }) => {
      return await request("/api/care_radiology/template/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    fetchAll: async () => {
      return await request("/api/care_radiology/template/", {
        method: "GET",
      });
    },
  },
};

interface DicomUploadResponse {
  message: string;
  study_uid: string;
}

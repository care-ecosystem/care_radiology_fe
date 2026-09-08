import { DicomStudy } from "./dicom";
import { Encounter } from "./encounter";
import { User } from "./user";

export interface Coding {
  code: string;
  display: string;
  system: string;
}

export interface DiagnosticReportReference {
  id: string;
  [key: string]: unknown;
}

export interface ServiceRequest {
  id: string;
  encounter: Encounter;
  requester: User;
  code?: Coding;
  body_site?: Coding;
  category?: string;
  diagnostic_reports?: DiagnosticReportReference[];

  [key: string]: unknown;
}

export interface RadiologyServiceRequest {
  service_request: ServiceRequest;
  dicom_study: DicomStudy;
}

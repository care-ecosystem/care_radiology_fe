import { DiagnosticReportStatus, DicomStudy } from "./dicom";

export type ImagingStudyStatus =
  "active" | "in_progress" | "completed" | "cancelled";

export type ArchiveState = "active" | "archived";

export interface ImagingStudyServiceRequest {
  id: string;
  title?: string;
  status?: string;
  diagnostic_reports?: {
    id: string;
    status?: DiagnosticReportStatus;
    [key: string]: unknown;
  }[];
  [key: string]: unknown;
}

export interface ImagingStudy {
  id: string | null;
  status: ImagingStudyStatus;
  accession_number: string | null;
  encounter: { id: string; [key: string]: unknown };
  service_request: ImagingStudyServiceRequest | null;
  studies: DicomStudy[];
}

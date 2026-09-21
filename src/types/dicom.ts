export interface DicomStudy {
  external_id: string;
  study_uid: string;
  study_date: string;
  study_description: string;
  study_modalities: string[];
  study_series: DicomSeries[];
  is_archived?: boolean;
  archive_reason?: string | null;
  archived_datetime?: string | null;
  service_request?: {
    id: string;
    diagnostic_report_id: string | null;
  } | null;
}

export interface DicomSeries {
  series_uid: string;
  series_number: string;
  series_instance_count: string;
  series_description: string;
}

export interface DicomStudyArchiveResponse {
  id: string;
  dicom_study_uid: string;
  is_archived: boolean;
  archive_reason: string;
  archived_datetime: string;
  archived_by: {
    external_id: string;
    first_name: string;
    last_name: string;
    username: string;
  };
}

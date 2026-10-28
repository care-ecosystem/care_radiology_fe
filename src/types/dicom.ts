export interface DicomStudyUser {
  id: string;
  username: string;
  prefix?: string | null;
  first_name: string;
  last_name: string;
  suffix?: string | null;
}

export interface DicomStudy {
  id: string;
  study_uid: string;
  study_date: string | null;
  study_description: string | null;
  study_modalities: string[];
  study_series: DicomSeries[];
  number_of_series?: number | null;
  number_of_instances?: number | null;
  is_archived?: boolean;
  archive_reason?: string | null;
  archived_datetime?: string | null;
  created_by?: DicomStudyUser | null;
  updated_by?: DicomStudyUser | null;
  archived_by?: DicomStudyUser | null;
  encounter_id?: string;
  accession_number?: string | null;
  service_request?: {
    id: string;
    title?: string | null;
    diagnostic_report_id: string | null;
  } | null;
}

export interface DicomSeries {
  series_uid: string;
  series_number: string[];
  series_instance_count: string[];
  series_description: string[];
  series_modality?: string[];
}

export interface DicomStudyArchiveResponse {
  id: string;
  study_uid: string;
  is_archived: boolean;
  archive_reason: string;
  archived_datetime: string | null;
  created_by?: DicomStudyUser | null;
  updated_by?: DicomStudyUser | null;
  archived_by?: DicomStudyUser | null;
}

export interface DicomStudy {
  external_id: string;
  study_uid: string;
  study_date: string;
  study_description: string;
  study_modalities: string[];
  study_series: DicomSeries[];
}

export interface DicomSeries {
  series_uid: string;
  series_number: string;
  series_instance_count: string;
  series_description: string;
  series_protocol: string;
}
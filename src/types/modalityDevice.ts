export const DICOM_CARE_TYPE = "dicom";

export const DICOM_ENABLER_CARE_TYPE = "dicom-enabler";

// DICOM modality codes (DCM coding scheme), as sent in Modality (0008,0060).
// Only X-ray and ultrasound are offered for now; uncomment a code to enable it.
export const MODALITY_CODES = [
  // { code: "AR", display: "Autorefraction" },
  // { code: "BMD", display: "Bone Mineral Densitometry" },
  // { code: "BDUS", display: "Ultrasound Bone Densitometry" },
  // { code: "EPS", display: "Cardiac Electrophysiology" },
  // { code: "CR", display: "Computed Radiography" },
  // { code: "CT", display: "Computed Tomography" },
  { code: "DX", display: "Digital Radiography" },
  // { code: "ECG", display: "Electrocardiography" },
  // { code: "ES", display: "Endoscopy" },
  // { code: "XC", display: "External-camera Photography" },
  // { code: "GM", display: "General Microscopy" },
  // { code: "HD", display: "Hemodynamic Waveform" },
  // { code: "IO", display: "Intra-oral Radiography" },
  // { code: "IVOCT", display: "Intravascular Optical Coherence Tomography" },
  // { code: "IVUS", display: "Intravascular Ultrasound" },
  // { code: "KER", display: "Keratometry" },
  // { code: "LEN", display: "Lensometry" },
  // { code: "MR", display: "Magnetic Resonance" },
  // { code: "MG", display: "Mammography" },
  // { code: "NM", display: "Nuclear Medicine" },
  // { code: "OAM", display: "Ophthalmic Axial Measurements" },
  // { code: "OCT", display: "Optical Coherence Tomography" },
  // { code: "OPM", display: "Ophthalmic Mapping" },
  // { code: "OP", display: "Ophthalmic Photography" },
  // { code: "OPR", display: "Ophthalmic Refraction" },
  // { code: "OPT", display: "Ophthalmic Tomography" },
  // { code: "OPV", display: "Ophthalmic Visual Field" },
  // { code: "OSS", display: "Optical Surface Scanner" },
  // { code: "PX", display: "Panoramic X-Ray" },
  // { code: "PT", display: "Positron emission tomography" },
  // { code: "RF", display: "Radiofluoroscopy" },
  // { code: "RG", display: "Radiographic imaging" },
  // { code: "SM", display: "Slide Microscopy" },
  // { code: "SRF", display: "Subjective Refraction" },
  { code: "US", display: "Ultrasound" },
  // { code: "VA", display: "Visual Acuity" },
  // { code: "XA", display: "X-Ray Angiography" },
] as const;

export type ModalityCode = (typeof MODALITY_CODES)[number]["code"];

export const MODALITY_ASSIGNMENT_STATUSES = ["unassigned", "assigned"] as const;

export type ModalityAssignmentStatus =
  (typeof MODALITY_ASSIGNMENT_STATUSES)[number];

// MachineEndpoint: the machine as a caller of the worklist / MPPS
export interface MachineEndpoint {
  ae_title: string;
  modality: ModalityCode;
  ip: string;
}

// DicomEndpoint: an SCP of the DICOM Enabler
export interface DicomEndpoint {
  ae_title: string;
  host?: string | null;
  port: number;
}

// care_metadata of a device with care_type "dicom"
export interface DicomDeviceMetadata {
  machine?: Partial<MachineEndpoint>;
  // external_id of the DICOM Enabler of the same facility the machine connects to
  dicom_enabler?: string;
  assignment_status?: ModalityAssignmentStatus;
  last_synced_at?: string | null;
}

// care_metadata of a device with care_type "dicom-enabler"
export interface DicomEnablerDeviceMetadata {
  ip: string;
  store_scp?: Partial<DicomEndpoint>;
  modality_scp?: Partial<DicomEndpoint>;
  assignment_status?: ModalityAssignmentStatus;
  last_synced_at?: string | null;
}

// Core CARE device status values
export type CareDeviceStatus = "active" | "inactive" | "entered_in_error";

export type CareDeviceAvailabilityStatus =
  | "lost"
  | "damaged"
  | "destroyed"
  | "available";

// Fields of the CARE device list response used by the plugin
export interface CareDevice<TMetadata = Record<string, unknown>> {
  id: string;
  registered_name: string;
  user_friendly_name?: string | null;
  care_type?: string | null;
  status?: CareDeviceStatus;
  availability_status?: CareDeviceAvailabilityStatus;
  care_metadata: TMetadata;
}

// Limits from the spec
export const AE_TITLE_MAX_LENGTH = 16;
// Printable ASCII without the backslash
export const AE_TITLE_PATTERN = /^[\x20-\x5B\x5D-\x7E]*$/;
export const PORT_PATTERN = /^[0-9]{0,5}$/;
export const PORT_MIN = 1;
export const PORT_MAX = 65535;

// IPv4 octet 0-255 without leading zeros, as the backend requires
const IPV4_OCTET = "(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";
const IPV4_PATTERN = new RegExp(`^${IPV4_OCTET}(\\.${IPV4_OCTET}){3}$`);

// Dotted IPv4 address, e.g. 192.168.1.40
export function isIpv4Address(value: string) {
  return IPV4_PATTERN.test(value);
}

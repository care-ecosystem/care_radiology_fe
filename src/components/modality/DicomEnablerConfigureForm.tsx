import { useTranslation } from "react-i18next";

import { PLUGIN_SLUG } from "@/constants";
import {
  AeTitleField,
  DeviceConfigureFormProps,
  FormSection,
  Ipv4Field,
  PortField,
  useDropAssignmentStatus,
  withoutAssignmentStatus,
} from "@/components/modality/common";
import {
  DicomEnablerDeviceMetadata,
  DicomEndpoint,
} from "@/types/modalityDevice";

type ScpSection = "store_scp" | "modality_scp";

// SCP listen hosts are fixed for now; the field is hidden and this value is always sent
const DEFAULT_SCP_HOST = "0.0.0.0";

// care_metadata form of a DICOM Enabler (care_type "dicom-enabler")
export default function DicomEnablerConfigureForm({
  metadata,
  onChange,
}: DeviceConfigureFormProps) {
  const { t } = useTranslation(PLUGIN_SLUG);
  const meta = metadata as DicomEnablerDeviceMetadata;
  useDropAssignmentStatus(meta, onChange);

  const emitChange = (next: DicomEnablerDeviceMetadata) =>
    onChange(
      withoutAssignmentStatus({
        ...next,
        store_scp: { ...next.store_scp, host: DEFAULT_SCP_HOST },
        modality_scp: { ...next.modality_scp, host: DEFAULT_SCP_HOST },
      }),
    );

  const handleScpChange = <K extends keyof DicomEndpoint>(
    section: ScpSection,
    key: K,
    value: DicomEndpoint[K] | undefined,
  ) => emitChange({ ...meta, [section]: { ...meta[section], [key]: value } });

  const renderScpSection = (
    section: ScpSection,
    title: string,
    aeTitlePlaceholder: string,
    aeTitleTooltip: string,
    portPlaceholder: string,
  ) => (
    <FormSection title={title}>
      <AeTitleField
        label={t("radiology_modality_ae_title")}
        required
        placeholder={aeTitlePlaceholder}
        tooltip={aeTitleTooltip}
        value={meta[section]?.ae_title ?? ""}
        onChange={(value) => handleScpChange(section, "ae_title", value)}
      />
      {/* Listen host is hidden for now; DEFAULT_SCP_HOST is always sent
      <TextField
        label={t("radiology_modality_host")}
        value={DEFAULT_SCP_HOST}
        disabled
      /> */}
      <PortField
        label={t("radiology_modality_port")}
        value={meta[section]?.port}
        placeholder={portPlaceholder}
        onChange={(value) => handleScpChange(section, "port", value)}
      />
    </FormSection>
  );

  return (
    <div className="space-y-6">
      <FormSection title={t("radiology_dicom_enabler")}>
        <Ipv4Field
          label={t("radiology_modality_ip")}
          placeholder="192.168.1.40"
          tooltip={t("radiology_dicom_enabler_ip_tooltip")}
          value={meta.ip ?? ""}
          onChange={(value) => emitChange({ ...meta, ip: value })}
        />
      </FormSection>
      {renderScpSection(
        "store_scp",
        t("radiology_modality_store_scp"),
        "STORESCP",
        t("radiology_modality_store_scp_ae_title_tooltip"),
        "2007",
      )}
      {renderScpSection(
        "modality_scp",
        t("radiology_modality_modality_scp"),
        "MODALITYSCP",
        t("radiology_modality_modality_scp_ae_title_tooltip"),
        "2008",
      )}
    </div>
  );
}

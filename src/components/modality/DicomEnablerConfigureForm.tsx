import { useEffect, useRef } from "react";
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

// What the DICOM Enabler ships with suggested values
const SCP_DEFAULTS: Record<
  ScpSection,
  Pick<DicomEndpoint, "ae_title" | "port">
> = {
  store_scp: { ae_title: "STORAGESCP", port: 2007 },
  modality_scp: { ae_title: "MODALITYSCP", port: 2008 },
};

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


  const defaultsApplied = useRef(false);
  useEffect(() => {
    if (defaultsApplied.current) return;
    defaultsApplied.current = true;
    const withDefaults = (section: ScpSection) => ({
      ...meta[section],
      ae_title: meta[section]?.ae_title || SCP_DEFAULTS[section].ae_title,
      port: meta[section]?.port ?? SCP_DEFAULTS[section].port,
    });
    const next = {
      ...meta,
      store_scp: withDefaults("store_scp"),
      modality_scp: withDefaults("modality_scp"),
    };
    const isUnchanged = (["store_scp", "modality_scp"] as ScpSection[]).every(
      (section) =>
        next[section].ae_title === meta[section]?.ae_title &&
        next[section].port === meta[section]?.port,
    );
    if (!isUnchanged) emitChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          placeholder={t("radiology_dicom_enabler_ip_placeholder")}
          tooltip={t("radiology_dicom_enabler_ip_tooltip")}
          value={meta.ip ?? ""}
          onChange={(value) => emitChange({ ...meta, ip: value })}
        />
      </FormSection>
      {renderScpSection(
        "store_scp",
        t("radiology_modality_store_scp"),
        t("radiology_modality_store_scp_ae_title_placeholder"),
        t("radiology_modality_store_scp_ae_title_tooltip"),
        t("radiology_modality_store_scp_port_placeholder"),
      )}
      {renderScpSection(
        "modality_scp",
        t("radiology_modality_modality_scp"),
        t("radiology_modality_modality_scp_ae_title_placeholder"),
        t("radiology_modality_modality_scp_ae_title_tooltip"),
        t("radiology_modality_modality_scp_port_placeholder"),
      )}
    </div>
  );
}

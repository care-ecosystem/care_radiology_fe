import { useState } from "react";
import { useTranslation } from "react-i18next";

import { PLUGIN_SLUG } from "@/constants";
import { ComboBox } from "@/components/ui/combobox";
import {
  AeTitleField,
  DeviceConfigureFormProps,
  dicomEnablerLabel,
  FormSection,
  Ipv4Field,
  SelectField,
  useDicomEnabler,
  useDicomEnablers,
  useDropAssignmentStatus,
  withoutAssignmentStatus,
} from "@/components/modality/common";
import {
  CareDevice,
  DicomDeviceMetadata,
  MachineEndpoint,
  MODALITY_CODES,
  ModalityCode,
} from "@/types/modalityDevice";

const MODALITY_CODE_OPTIONS = MODALITY_CODES.map(({ code, display }) => ({
  value: code,
  label: `${code} - ${display}`,
}));

// care_metadata form of a DICOM device (care_type "dicom")
export default function DicomDeviceConfigureForm({
  facilityId,
  metadata,
  onChange,
}: DeviceConfigureFormProps) {
  const { t } = useTranslation(PLUGIN_SLUG);
  const meta = metadata as DicomDeviceMetadata;
  useDropAssignmentStatus(meta, onChange);
  const [enablerSearch, setEnablerSearch] = useState("");
  const { data: enablers, isLoading: enablersLoading } = useDicomEnablers(
    facilityId,
    enablerSearch,
  );
  const { data: selectedEnabler } = useDicomEnabler(
    facilityId,
    meta.dicom_enabler,
  );

  // The IP is part of the label so the selected DICOM Enabler shows it too
  const toEnablerOption = (device: CareDevice) => ({
    value: device.id,
    label: dicomEnablerLabel(device),
  });
  const enablerOptions = (enablers?.results ?? []).map(toEnablerOption);
  // Keep the selected DICOM Enabler as an option so its name shows even when the search
  // results leave it out
  if (
    selectedEnabler &&
    !enablerOptions.some(({ value }) => value === selectedEnabler.id)
  ) {
    enablerOptions.unshift(toEnablerOption(selectedEnabler));
  }

  const emitChange = (next: DicomDeviceMetadata) =>
    onChange(withoutAssignmentStatus(next));

  const handleMachineChange = <K extends keyof MachineEndpoint>(
    key: K,
    value: MachineEndpoint[K],
  ) => emitChange({ ...meta, machine: { ...meta.machine, [key]: value } });

  return (
    <div className="space-y-6">
      <FormSection title={t("radiology_modality_dicom_enabler")}>
        <SelectField
          label={t("radiology_modality_dicom_enabler")}
          required
          isEmpty={!meta.dicom_enabler}
        >
          <ComboBox
            options={enablerOptions}
            value={meta.dicom_enabler ?? null}
            onSelect={(value) => {
              emitChange({ ...meta, dicom_enabler: value });
              setEnablerSearch("");
            }}
            search={enablerSearch}
            onSearchChange={setEnablerSearch}
            loading={enablersLoading}
            placeholder={t("radiology_modality_select_dicom_enabler")}
            searchPlaceholder={t("radiology_modality_search_dicom_enabler")}
            emptyMessage={t("radiology_modality_no_dicom_enablers_found")}
            loadingMessage={t("radiology_loading")}
          />
        </SelectField>
      </FormSection>
      <FormSection title={t("radiology_modality_machine")}>
        <AeTitleField
          label={t("radiology_modality_ae_title")}
          required
          placeholder="CT1"
          value={meta.machine?.ae_title ?? ""}
          onChange={(value) => handleMachineChange("ae_title", value)}
        />
        <SelectField
          label={t("radiology_modality_code")}
          required
          isEmpty={!meta.machine?.modality}
        >
          <ComboBox
            options={MODALITY_CODE_OPTIONS}
            value={meta.machine?.modality ?? null}
            onSelect={(value) =>
              handleMachineChange("modality", value as ModalityCode)
            }
            placeholder={t("radiology_modality_select_code")}
            searchPlaceholder={t("radiology_modality_search_code")}
            emptyMessage={t("radiology_modality_no_codes_found")}
          />
        </SelectField>
        <Ipv4Field
          label={t("radiology_modality_ip")}
          placeholder="192.168.1.45"
          value={meta.machine?.ip ?? ""}
          onChange={(value) => handleMachineChange("ip", value)}
        />
      </FormSection>
    </div>
  );
}

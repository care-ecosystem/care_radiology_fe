import { useTranslation } from "react-i18next";

import { PLUGIN_SLUG } from "@/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ConnectionStatus,
  DeviceShowPageCardProps,
  dicomEnablerName,
  Field,
  useDicomEnabler,
} from "@/components/modality/common";
import { DicomDeviceMetadata, MODALITY_CODES } from "@/types/modalityDevice";

// care_metadata card of a DICOM device (care_type "dicom")
export default function DicomDeviceShowPageCard({
  facilityId,
  device,
}: DeviceShowPageCardProps) {
  const { t } = useTranslation(PLUGIN_SLUG);
  const meta = device.care_metadata as DicomDeviceMetadata;
  const { data: enabler } = useDicomEnabler(facilityId, meta.dicom_enabler);

  const modality = MODALITY_CODES.find(
    ({ code }) => code === meta.machine?.modality,
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t("radiology_dicom_device_configuration")}</CardTitle>
        <CardDescription>
          {t("radiology_dicom_device_configuration_description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label={t("radiology_modality_connection")}>
            <ConnectionStatus status={meta.assignment_status} />
          </Field>
          <Field label={t("radiology_modality_dicom_enabler")}>
            {enabler ? dicomEnablerName(enabler) : meta.dicom_enabler || "--"}
          </Field>
          <Field label={t("radiology_modality_ae_title")}>
            {meta.machine?.ae_title || "--"}
          </Field>
          <Field label={t("radiology_modality_code")}>
            {modality
              ? `${modality.code} - ${modality.display}`
              : meta.machine?.modality || "--"}
          </Field>
          <Field label={t("radiology_modality_ip")}>
            {meta.machine?.ip || "--"}
          </Field>
        </div>
      </CardContent>
    </Card>
  );
}

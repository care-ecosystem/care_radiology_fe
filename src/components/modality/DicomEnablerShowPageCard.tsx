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
  DeviceShowPageCardProps,
  Field,
  SyncStatus,
} from "@/components/modality/common";
import { formatDateTime } from "@/utils/auditUtils";
import {
  DicomEnablerDeviceMetadata,
  DicomEndpoint,
} from "@/types/modalityDevice";

// care_metadata card of a DICOM Enabler (care_type "dicom-enabler")
export default function DicomEnablerShowPageCard({
  device,
}: DeviceShowPageCardProps) {
  const { t } = useTranslation(PLUGIN_SLUG);
  const meta = device.care_metadata as DicomEnablerDeviceMetadata;

  const renderEndpoint = (
    title: string,
    endpoint?: Partial<DicomEndpoint> | null,
  ) => (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      <Field label={t("radiology_modality_ae_title")}>
        {endpoint?.ae_title || "--"}
      </Field>
      {/* Listen IP address is hidden for now
      <Field label={t("radiology_modality_host")}>
        {endpoint?.host || "--"}
      </Field> */}
      <Field label={t("radiology_modality_port")}>
        {endpoint?.port ?? "--"}
      </Field>
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t("radiology_dicom_enabler_configuration")}</CardTitle>
        <CardDescription>
          {t("radiology_dicom_enabler_configuration_description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label={t("radiology_modality_sync_status")}>
            <SyncStatus status={meta.assignment_status} />
          </Field>
          <Field label={t("radiology_modality_last_synced")}>
            {meta.last_synced_at ? formatDateTime(meta.last_synced_at) : "--"}
          </Field>
          <Field label={t("radiology_modality_ip")}>{meta.ip || "--"}</Field>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {renderEndpoint(t("radiology_modality_store_scp"), meta.store_scp)}
          {renderEndpoint(
            t("radiology_modality_modality_scp"),
            meta.modality_scp,
          )}
        </div>
      </CardContent>
    </Card>
  );
}

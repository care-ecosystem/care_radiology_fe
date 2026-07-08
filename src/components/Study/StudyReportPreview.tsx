import PrintPreview from "@/CAREUI/misc/PrintPreview";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import careConfig from "@/config/careConfig";
import { apis } from "@/apis";
import { formatPatientAge } from "@/utils/formatPatientAge";
import { formatName } from "@/utils/auditUtils";
import { useTranslation } from "react-i18next";
import { formatPhoneNumberIntl } from "react-phone-number-input";

interface Props {
  studyUid: string;
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="grid grid-cols-10 items-center gap-x-2">
      <span className="text-gray-600 col-span-4">{label}</span>
      <span className="text-gray-600 col-span-1">:</span>
      <span className="font-semibold break-words col-span-5">{value || "-"}</span>
    </div>
  );
}

function SectionLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-800 border-b-2 border-gray-400 pb-1">
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function StudyReportPreview({ studyUid }: Props) {
  const [report, setReport] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const { t } = useTranslation("care_radiology_fe");
  const { t: basetranslate } = useTranslation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const reportId = new URLSearchParams(window.location.search).get("reportId");
        const reportRes = await apis.studyReport.fetchByStudy(studyUid);
        const results: any[] = reportRes?.results ?? [];

        const r = reportId
          ? (results.find((rep) => rep.external_id === reportId) ?? results[0])
          : results[0];

        if (r) {
          setReport({
            technique: r.technique || "",
            findings: r.findings || "",
            impression: r.impression || "",
            modality: r.modality || "",
            body_part: r.body_part || "",
            scan_protocol: r.scan_protocol || "",
          });
          setUser(r.created_by || null);
          setPatient(r.patient || null);
        }
      } catch (err) {
        console.error("Failed to load preview data", err);
      }
    };

    fetchData();
  }, [studyUid]);

  if (!report) {
    return <div className="p-4">{t("radiology_no_preview_data_found")}</div>;
  }

  const doctorName = formatName(user);
  const patientAge = patient
    ? `${formatPatientAge(patient, true)}, ${basetranslate(`GENDER__${patient.gender}`)}`
    : "-";

  return (
    <PrintPreview title={`${t("radiology_report")} - ${patient?.name}`}>
      <div className="py-2 max-w-4xl mx-auto">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex justify-between items-start pb-2 border-b border-gray-200">
            <div className="space-y-1 flex-1">
              <h1 className="text-3xl font-semibold">
                {patient?.facility?.name || t("radiology_facility")}
              </h1>
              <h2 className="text-gray-500 uppercase text-sm tracking-wide font-semibold">
                {t("radiology_study_report")}
              </h2>
            </div>
            <img
              src={careConfig.mainLogo?.dark}
              alt="Care Logo"
              className="h-10 w-auto object-contain ml-6"
            />
          </div>

          {/* Patient Details (CARE FE STYLE) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-8">
            {/* Left column */}
            <div className="space-y-3">
              <DetailRow
                label={t("radiology_patient_name")}
                value={patient?.name}
              />
              <DetailRow
                label={`${t("radiology_age")} / ${t("radiology_sex")}`}
                value={patientAge}
              />
            </div>

            {/* Right column */}
            <div className="space-y-3">
              <DetailRow
                label={t("radiology_mobile_number")}
                value={
                  patient?.phone_number
                    ? formatPhoneNumberIntl(patient.phone_number)
                    : "-"
                }
              />
              <DetailRow
                label={t("radiology_doctor_name")}
                value={doctorName}
              />
            </div>
          </div>

          <SectionLayout title={t("radiology_modality")}>
            <div
              className="text-sm leading-relaxed text-gray-800"
              style={{ overflowWrap: "anywhere", wordBreak: "break-word", whiteSpace: "normal", }}
            >
              {report.modality}
            </div>
          </SectionLayout>

          <SectionLayout title={t("radiology_body_part")}>
            <div
              className="text-sm leading-relaxed text-gray-800"
              style={{ overflowWrap: "anywhere", wordBreak: "break-word", whiteSpace: "normal", }}
            >
              {report.body_part}
            </div>
          </SectionLayout>

          <SectionLayout title={t("radiology_scan_protocol")}>
            <div
              className="text-sm leading-relaxed text-gray-800"
              style={{ overflowWrap: "anywhere", wordBreak: "break-word", whiteSpace: "normal", }}
            >
              {report.scan_protocol}
            </div>
          </SectionLayout>

          {/* Technique */}
          <SectionLayout title={t("radiology_technique")}>
            <div
              className="text-sm leading-relaxed text-gray-800"
              style={{ overflowWrap: "anywhere", wordBreak: "break-word", whiteSpace: "normal", }}
              dangerouslySetInnerHTML={{ __html: report.technique }}
            />
          </SectionLayout>

          {/* Findings */}
          <SectionLayout title={t("radiology_findings")}>
            <div
              className="text-sm leading-relaxed text-gray-800"
              style={{ overflowWrap: "anywhere", wordBreak: "break-word", whiteSpace: "normal", }}
              dangerouslySetInnerHTML={{ __html: report.findings }}
            />
          </SectionLayout>

          {/* Impression */}
          <SectionLayout title={t("radiology_impression")}>
            <div
              className="text-sm leading-relaxed text-gray-800"
              style={{ overflowWrap: "anywhere", wordBreak: "break-word", whiteSpace: "normal", }}
              dangerouslySetInnerHTML={{ __html: report.impression }}
            />
          </SectionLayout>

          {/* Reported By */}
          <div className="flex justify-end mt-6">
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase">
                {t("radiology_reported_by")}
              </p>
              <p className="font-semibold text-sm text-gray-800">
                {doctorName}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-2 text-[10px] text-gray-500 border-t flex justify-between">
            <p>
              {t("radiology_generated_on")}{" "}
              {format(new Date(), "MMMM do, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>
      </div>
    </PrintPreview>
  );
}
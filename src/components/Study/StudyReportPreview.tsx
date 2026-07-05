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
    <div className="grid grid-cols-[10rem_auto_1fr] md:grid-cols-[8rem_auto_1fr] items-center">
      <span className="text-gray-600">{label}</span>
      <span className="text-gray-600">:</span>
      <span className="font-semibold break-words">{value || "-"}</span>
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
      <h3 className="text-sm font-semibold text-gray-700 border-b pb-1">
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
        const path = window.location.pathname;
        const serviceRequestMatch = path.match(/\/service_requests?\/([^/]+)/);
        const serviceRequestId = serviceRequestMatch?.[1];

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
          });
        }

        if (serviceRequestId) {
          const radiologyServiceRequests: any[] = await apis.servicerequest.fetch({
            serviceRequestId,
          });
          const relevant = radiologyServiceRequests.find(
            (sr) => sr.dicom_study?.external_id === studyUid
          );
          if (relevant) {
            const sr = relevant.service_request;
            setPatient(sr.encounter.patient);
            setUser(sr.requester);
          }
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
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

          {/* Technique */}
          <SectionLayout title={t("radiology_technique")}>
            <div
              className="text-sm leading-relaxed text-gray-800"
              style={{ overflowWrap: "anywhere", wordBreak: "break-word", whiteSpace: "normal" }}
              dangerouslySetInnerHTML={{ __html: report.technique }}
            />
          </SectionLayout>

          {/* Findings */}
          <SectionLayout title={t("radiology_findings")}>
            <div
              className="text-sm leading-relaxed text-gray-800"
              style={{ overflowWrap: "anywhere", wordBreak: "break-word", whiteSpace: "normal" }}
              dangerouslySetInnerHTML={{ __html: report.findings }}
            />
          </SectionLayout>

          {/* Impression */}
          <SectionLayout title={t("radiology_impression")}>
            <div
              className="text-sm leading-relaxed text-gray-800"
              style={{ overflowWrap: "anywhere", wordBreak: "break-word", whiteSpace: "normal" }}
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
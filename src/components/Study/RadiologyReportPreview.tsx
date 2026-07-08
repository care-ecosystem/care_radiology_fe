import { useEffect, useState } from "react";
import { apis } from "@/apis";
import { Button } from "@/components/ui/button";
import { Pencil, Printer } from "lucide-react";
import { format } from "date-fns";
import PatientDetails from "@/components/Common/PatientDetails";
import RadiologyAuditPopup from "@/components/Common/RadiologyAuditPopup";
import { RadiologyServiceRequest } from "@/types/ServiceRequest";
import { useTranslation } from "react-i18next";
import { PLUGIN_SLUG } from "@/constants";

type ReportListItem = {
  external_id: string;
  modality?: string;
  body_part?: string;
  scan_protocol?: string;
  technique?: string;
  findings?: string;
  impression?: string;
  created_datetime?: string;
  last_modified_datetime?: string;
  created_by?: { username?: string; first_name?: string; last_name?: string } | string;
  updated_by?: { username?: string; first_name?: string; last_name?: string } | string;
};

type Props = {
  studyId: string;
  serviceRequestId: string;
  facilityId: string;
  initialReportId?: string;
  onClose: () => void;
  onEdit: (studyId: string, reportId: string) => void;
};

const getUserLabel = (u?: ReportListItem["created_by"]) => {
  if (!u) return "—";
  if (typeof u === "string") return u;
  const name = [u.first_name, u.last_name].filter(Boolean).join(" ");
  return name || u.username || "—";
};

export default function RadiologyReportPreview({
  studyId,
  serviceRequestId,
  facilityId,
  initialReportId,
  onClose,
  onEdit,
}: Props) {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialReportId ?? null);
  const [loading, setLoading] = useState(true);

  const [patient, setPatient] = useState<any>(null);
  const [requester, setRequester] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [dicomStudy, setDicomStudy] = useState<any>(null);
  const [showAuditPopup, setShowAuditPopup] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const { t } = useTranslation(PLUGIN_SLUG);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const res = await apis.studyReport.fetchByStudy(studyId);
        const results: ReportListItem[] = res?.results ?? [];
        setReports(results);
        if (!initialReportId && results.length > 0) {
          setSelectedId(results[0].external_id);
        }
        const anyReportWithPatient = results.find((r: any) => r.patient);
        if (anyReportWithPatient) {
          setPatient((anyReportWithPatient as any).patient);
          setRequester((anyReportWithPatient as any).created_by ?? null);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [studyId, initialReportId]);

  useEffect(() => {
    if (!patient?.id) return;
    const fetchDicomStudyFallback = async () => {
      try {
        const studies: any[] = await apis.dicom.fetchStudies({ patient: patient.id });
        const match = studies?.find((s: any) => s.external_id === studyId);
        if (match) {
          setDicomStudy((prev: any) => prev ?? match);
        }
      } catch (err) {
        console.error("Failed to fetch dicom study fallback", err);
      }
    };
    fetchDicomStudyFallback();
  }, [studyId, patient]);

  useEffect(() => {
    if (!serviceRequestId || serviceRequestId === ":serviceRequestId") return;
    const fetchPatientContext = async () => {
      try {
        const radiologyServiceRequests: RadiologyServiceRequest[] =
          await apis.servicerequest.fetch({ serviceRequestId });
        const relevant = radiologyServiceRequests.find(
          (sr) => sr.dicom_study.external_id === studyId
        );
        if (!relevant) return;
        const sr = relevant.service_request;
        setPatient(sr.encounter.patient);
        setRequester(sr.requester);
        setDepartments((sr.encounter.organizations as any[]) ?? []);
        setDicomStudy(relevant.dicom_study);
      } catch (err) {
        console.error("Failed to fetch patient context", err);
      }
    };
    fetchPatientContext();
  }, [serviceRequestId, studyId]);

  useEffect(() => {
    if (showAuditPopup && selectedId) {
      apis.studyReportAudit.fetchByStudyReport(selectedId).then((res) => {
        const results: any[] = (res as any)?.results ?? [];
        setAuditLogs(results);
      });
    }
  }, [showAuditPopup, selectedId]);

  const selectedReport = reports.find((r) => r.external_id === selectedId) ?? null;

  const handleEdit = () => {
    if (!selectedId) return;
    onEdit(studyId, selectedId);
  };

  const handlePrint = () => {
    if (!selectedId) return;
    window.open(
      `/facility/${facilityId}/service_requests/${serviceRequestId}/radiology/report/${studyId}/preview?reportId=${selectedId}`,
      "_blank"
    );
  };

  return (
    <div className="w-full h-full flex flex-col bg-white cursor-default">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 flex-shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">{t("radiology_report")}</h1>
      </div>

      {/* Patient Details */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200">
        <PatientDetails
          patient={patient}
          requester={requester}
          dicomStudy={dicomStudy}
          departments={departments}
          onInfoClick={selectedReport ? () => setShowAuditPopup(true) : undefined}
        />
      </div>

      {/* Main Content */}
      <div className="flex flex-row flex-1 overflow-hidden bg-gray-50">
        {/* Sidebar: Report List */}
        <div
          className="border-r border-gray-200 bg-white overflow-y-auto shrink-0"
          style={{ width: 280, minWidth: 280, maxWidth: 280 }}
        >
          {loading ? (
            <p className="p-4 text-sm text-gray-500">{t("dicom_loading")}</p>
          ) : reports.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">{t("dicom_no_reports")}</p>
          ) : (
            <div>
              {reports.map((report, idx) => {
                const isSelected = report.external_id === selectedId;
                return (
                  <div
                    key={report.external_id}
                    className={`border-b border-gray-100 cursor-pointer transition-colors ${
                      isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      setSelectedId(report.external_id);
                      setAuditLogs([]);
                    }}
                  >
                    <div className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900 mb-2">
                        {t("dicom_report_no")}: {idx + 1}
                      </p>
                      <p className="text-xs text-gray-600 mb-1">
                        {t("radiology_created_by")}: <span className="font-bold">{getUserLabel(report.created_by)}</span>
                      </p>
                      <p className="text-xs text-gray-500 mb-2">
                        {report.created_datetime
                          ? format(new Date(report.created_datetime), "yyyy-MM-dd'T'HH:mm:ss")
                          : "—"}
                      </p>
                      {report.updated_by && (
                        <>
                          <p className="text-xs text-gray-600 mb-1">
                            {t("radiology_last_modified_by")}: <span className="font-bold">{getUserLabel(report.updated_by)}</span>
                          </p>
                          <p className="text-xs text-gray-500">
                            {report.last_modified_datetime
                              ? format(new Date(report.last_modified_datetime), "yyyy-MM-dd'T'HH:mm:ss")
                              : "—"}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Main Panel: Report Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {!selectedReport ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>{t("dicom_select_report")}</p>
            </div>
          ) : (
            <div className="max-w-5xl bg-white rounded border border-gray-200 p-6 space-y-4">
              {/* Key Info - Stacked Vertically with Uniform Spacing */}
              <div className="space-y-4 pb-2">
                <div>
                  <p className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-1">
                    {t("radiology_modality")}
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed [&_*]:!font-sans [&_*]:!text-sm [&_*]:!text-gray-700" style={{ wordBreak: "break-word" }}>
                    {selectedReport.modality || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-1">
                    {t("radiology_body_part")}
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed [&_*]:!font-sans [&_*]:!text-sm [&_*]:!text-gray-700" style={{ wordBreak: "break-word" }}>
                    {selectedReport.body_part || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-1">
                    {t("radiology_scan_protocol")}
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed [&_*]:!font-sans [&_*]:!text-sm [&_*]:!text-gray-700" style={{ wordBreak: "break-word" }}>
                    {selectedReport.scan_protocol || "—"}
                  </p>
                </div>
              </div>

              {/* Technique */}
              <div>
                <p className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-1">
                  {t("radiology_technique")}
                </p>
                <div
                  className="text-sm text-gray-700 leading-relaxed [&_*]:!font-sans [&_*]:!text-sm [&_*]:!text-gray-700"
                  style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                >
                  {selectedReport.technique ? (
                    <div dangerouslySetInnerHTML={{ __html: selectedReport.technique }} />
                  ) : (
                    "—"
                  )}
                </div>
              </div>

              {/* Findings */}
              <div>
                <p className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-1">
                  {t("radiology_findings")}
                </p>
                <div
                  className="text-sm text-gray-700 leading-relaxed [&_*]:!font-sans [&_*]:!text-sm [&_*]:!text-gray-700"
                  style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                >
                  {selectedReport.findings ? (
                    <div dangerouslySetInnerHTML={{ __html: selectedReport.findings }} />
                  ) : (
                    "—"
                  )}
                </div>
              </div>

              {/* Impression */}
              <div>
                <p className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-1">
                  {t("radiology_impression")}
                </p>
                <div
                  className="text-sm text-gray-700 leading-relaxed [&_*]:!font-sans [&_*]:!text-sm [&_*]:!text-gray-700"
                  style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                >
                  {selectedReport.impression ? (
                    <div dangerouslySetInnerHTML={{ __html: selectedReport.impression }} />
                  ) : (
                    "—"
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {selectedReport && (
        <div className="border-t border-gray-200 bg-white px-6 py-4 flex justify-end gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="cursor-pointer w-30"
          >
            {t("radiology_view_report_cancel")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="cursor-pointer w-30 flex items-center justify-center"
          >
            <Printer size={16} className="mr-2" />
            {t("radiology_view_report_print_preview")}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleEdit}
            className="cursor-pointer w-30 flex items-center justify-center"
          >
            <Pencil size={16} className="mr-2" />
            {t("radiology_view_report_edit")}
          </Button>
        </div>
      )}

      <RadiologyAuditPopup
        open={showAuditPopup}
        onClose={() => setShowAuditPopup(false)}
        audits={auditLogs}
      />
    </div>
  );
}
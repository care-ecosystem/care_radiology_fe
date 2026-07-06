import { useEffect, useState } from "react";
import { apis } from "@/apis";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Printer, ChevronDown } from "lucide-react";
import KbdBadge from "@/components/ui/kbd-badge";
import { format } from "date-fns";
import PatientDetails from "@/components/Common/PatientDetails";
import RadiologyAuditPopup from "@/components/Common/RadiologyAuditPopup";
import { RadiologyServiceRequest } from "@/types/ServiceRequest";

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

  useEffect(() => {
    if (!selectedReport) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape always closes, regardless of Shift, and even while typing
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (isTyping) return;

      if (e.key.toLowerCase() === "p") {
        e.preventDefault();
        handlePrint();
      } else if (e.shiftKey && e.key.toLowerCase() === "w") {
        e.preventDefault();
        handleEdit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedReport, selectedId]);

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
        <h1 className="text-2xl font-semibold text-gray-900">Radiology Report</h1>
      </div>


      <div className="flex-shrink-0">
        <PatientDetails
          patient={patient}
          requester={requester}
          dicomStudy={dicomStudy}
          departments={departments}
          onInfoClick={selectedReport ? () => setShowAuditPopup(true) : undefined}
        />
      </div>

      <div className="flex flex-row flex-1 overflow-hidden">
        {/* Side panel: all reports */}
        <div
          className="border-r bg-gray-50 overflow-y-auto shrink-0"
          style={{ width: 300, minWidth: 300, maxWidth: 300 }}
        >
          {loading ? (
            <p className="p-4 text-sm text-gray-500">Loading reports…</p>
          ) : reports.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No reports found</p>
          ) : (
            reports.map((report, idx) => {
              const isSelected = report.external_id === selectedId;
              return (
                <button
                  key={report.external_id}
                  onClick={() => {
                    setSelectedId(report.external_id);
                    setAuditLogs([]);
                  }}
                  className={`w-full text-left px-4 py-3 border-b text-sm transition-colors ${
                    isSelected
                      ? "bg-white border-l-4 border-l-primary"
                      : "hover:bg-gray-100 border-l-4 border-l-transparent"
                  }`}
                >
                  <p className="font-medium text-gray-800 mb-1">Report No: {idx + 1}</p>
                  <p className="text-gray-600 text-sm mb-1">
                    <span className="text-gray-400">Created by: </span>
                    {getUserLabel(report.created_by)}
                  </p>
                  <p className="text-gray-600 text-sm mb-1">
                    <span className="text-gray-400">Modified by: </span>
                    {getUserLabel(report.updated_by)}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    Created:{" "}
                    {report.created_datetime
                      ? format(new Date(report.created_datetime), "dd MMM yyyy, hh:mm aa")
                      : "—"}
                  </p>
                  <p className="text-gray-500 text-xs">
                    Modified:{" "}
                    {report.last_modified_datetime
                      ? format(new Date(report.last_modified_datetime), "dd MMM yyyy, hh:mm aa")
                      : "—"}
                  </p>

                </button>
              );
            })
          )}
        </div>

        {/* Main panel: selected report */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedReport ? (
            <p className="text-sm text-gray-500">Select a report to view</p>
          ) : (
            <Card className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Modality</h4>
                  <div className="flex items-center justify-between h-10 px-3 rounded-md border border-gray-200 bg-gray-100 text-sm text-gray-900">
                    <span className="truncate">{selectedReport.modality || "—"}</span>
                    <ChevronDown size={16} className="text-gray-400 shrink-0" />
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">
                    Body Part
                  </h4>
                  <div className="flex items-center justify-between h-10 px-3 rounded-md border border-gray-200 bg-gray-100 text-sm text-gray-900">
                    <span className="truncate">{selectedReport.body_part || "—"}</span>
                    <ChevronDown size={16} className="text-gray-400 shrink-0" />
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Scan Protocol</h4>
                  <div className="flex items-center justify-between h-10 px-3 rounded-md border border-gray-200 bg-gray-100 text-sm text-gray-900">
                    <span className="truncate">{selectedReport.scan_protocol || "—"}</span>
                    <ChevronDown size={16} className="text-gray-400 shrink-0" />
                  </div>
                </div>
              </div>


              <div>
                <h4 className="font-medium text-gray-700 text-sm mb-1">Technique</h4>
                <div
                  className="border rounded-md bg-gray-50 mt-1 p-3 min-h-[80px] text-sm text-gray-500 cursor-not-allowed break-words whitespace-pre-wrap [overflow-wrap:anywhere] [&_*]:!font-sans [&_*]:!text-sm [&_*]:!font-normal [&_*]:!text-gray-500 [&_*]:!bg-transparent [&_*]:!leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: selectedReport.technique || "—" }}
                />
              </div>

              <div>
                <h4 className="font-medium text-gray-700 text-sm mb-1">
                  Findings
                </h4>
                <div
                  className="border rounded-md bg-gray-50 p-3 min-h-[100px] text-sm text-gray-500 cursor-not-allowed break-words whitespace-pre-wrap [overflow-wrap:anywhere] [&_*]:!font-sans [&_*]:!text-sm [&_*]:!font-normal [&_*]:!text-gray-500 [&_*]:!bg-transparent [&_*]:!leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: selectedReport.findings || "—" }}
                />
              </div>

              <div>
                <h4 className="font-medium text-gray-700 text-sm mb-1">
                  Impression 
                </h4>
                <div
                  className="border rounded-md bg-gray-50 mt-1 p-3 min-h-[80px] text-sm text-gray-500 cursor-not-allowed break-words whitespace-pre-wrap [overflow-wrap:anywhere] [&_*]:!font-sans [&_*]:!text-sm [&_*]:!font-normal [&_*]:!text-gray-500 [&_*]:!bg-transparent [&_*]:!leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: selectedReport.impression || "—" }}
                />
              </div>
            </Card>
          )}
        </div>
      </div>

      {selectedReport && (
        <div className="border-t bg-white p-4 flex justify-end gap-3 flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
            <KbdBadge keys="shift+esc" />
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer size={16} className="mr-2" />
            Print
            <KbdBadge keys="shift+p" />
          </Button>
          <Button variant="default" onClick={handleEdit}>
            <Pencil size={16} className="mr-2" />
            Edit
            <KbdBadge keys="shift+w" variant="solid" />
          </Button>``
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
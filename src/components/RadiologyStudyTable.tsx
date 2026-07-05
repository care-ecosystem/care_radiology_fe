import { DicomStudy } from "@/types/Dicom";
import { FC, useMemo, useState, useEffect } from "react";
import DicomViewer from "./DicomViewer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { navigate } from "raviger";
import { Eye, FileText, Info, X, Pencil, Plus, FilePlusIcon } from "lucide-react";
import { format } from "date-fns";
import React from "react";
import { apis } from "@/apis";
import { PLUGIN_SLUG } from "@/constants";
import { useTranslation } from "react-i18next";
import DicomReport from "./DicomReport";
import { Button } from "./ui/button";
import RadiologyReportPreview from "./Study/StudyReportPreview";


type RadiologyStudyTableProps = { className?: string, studies: DicomStudy[] };
export const RadiologyStudyTable: FC<RadiologyStudyTableProps> = (props) => {
  const { t } = useTranslation(PLUGIN_SLUG);

  const [showModal, setShowModal] = useState(false);
  const [selectedStudy, setSelectedStudy] = useState<DicomStudy | null>(null);
  const [viewerStudyUid, setViewerStudyUid] = useState<string | null>(null);
  const [showReportSelectModal, setShowReportSelectModal] = useState(false);
  const [reportSelectStudyId, setReportSelectStudyId] = useState<string>("");
  const [reportSelectList, setReportSelectList] = useState<any[]>([]);

  const [showPreviewPanel, setShowPreviewPanel] = useState(false);
  const [previewStudyId, setPreviewStudyId] = useState<string>("");

  
  // Report creation modal state
  const [showReportCreationModal, setShowReportCreationModal] = useState(false);
  const [reportCreationStudyId, setReportCreationStudyId] = useState<string>("");

  const [localStudies, setLocalStudies] = useState<DicomStudy[]>(props.studies);
  useEffect(() => {
    setLocalStudies(props.studies);
  }, [props.studies]);

  const handleReportSaved = (studyId: string) => {
    setLocalStudies((prev) =>
      prev.map((s) =>
        s.external_id === studyId ? { ...s, has_report: true } : s
      )
    );
  };


  const handleInfoClick = async (study: DicomStudy) => {
    try {
      setSelectedStudy(study);
      setShowModal(true);
    } catch (error) {
      console.error("Error fetching series info:", error);
    }
  };

  const {facilityId, serviceRequestId} = useMemo(() => {
    const path = window.location.pathname;
    const facilityMatch = path.match(/\/facility\/([^/]+)/);
    const serviceRequestMatch = path.match(/\/service_requests?\/([^/]+)/);

    return {
      facilityId: facilityMatch?.[1] ?? ":facilityId",
      serviceRequestId: serviceRequestMatch?.[1] ?? ":serviceRequestId",
    };
  }, []);

  const handlePreview = (studyId: string) => {
    setPreviewStudyId(studyId);
    setShowPreviewPanel(true);
  }

  const handleViewStudy = (studyUid: string) => {
    setViewerStudyUid(studyUid);
  }

  const handleEditReport = async (studyId: string) => {
    const res = await apis.studyReport.fetchByStudy(studyId);
    const reports: any[] = res?.results ?? [];

    if (reports.length <= 1) {
      const query = reports.length === 1 ? `?reportId=${reports[0].external_id}` : "";
      navigate(`/facility/${facilityId}/service_requests/${serviceRequestId}/radiology/report/${studyId}${query}`);
      return;
    }

    setReportSelectStudyId(studyId);
    setReportSelectList(reports);
    setShowReportSelectModal(true);
  };


  // Handle "New Report" button click - Opens modal immediately
  const handleNewReportClick = (studyId: string) => {
    setReportCreationStudyId(studyId);
    setShowReportCreationModal(true);
  };

  const handleReportSelect = (reportId: string) => {
    setShowReportSelectModal(false);
    navigate(
      `/facility/${facilityId}/service_requests/${serviceRequestId}/radiology/report/${reportSelectStudyId}?reportId=${reportId}`
    );
  };


  // Handle closing the report creation modal
  const handleCloseReportModal = () => {
    setShowReportCreationModal(false);
    setReportCreationStudyId("");
  };

  return (
    <React.Fragment>
      <div className={`${props.className ?? ''} rounded-md border`}>
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100">
              <TableHead>Study Name</TableHead>
              <TableHead>Study Date</TableHead>
              <TableHead>Study Modality</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {localStudies.map((study: DicomStudy) => (
              <TableRow key={study.external_id}>
                <TableCell>{study.study_description || "—"}</TableCell>
                <TableCell>
                  {(study.study_date
                    ? format(study.study_date, "dd MMMM, yyyy")
                    : null) || "—"}
                </TableCell>
                <TableCell>
                  {(study.study_modalities as string[])?.join(", ") || "—"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2 items-center justify-end flex-wrap">
                    {study.has_report && 
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(study.external_id)}
                        className="text-xs h-auto py-1 px-2"
                      >
                        <FileText size={16} className="mr-1" />
                        View Report
                      </Button>
                    }             
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewStudy(study.study_uid)}
                      className="text-xs h-auto py-1 px-2"
                    >
                      <Eye size={16} className="mr-1" />
                      {t("dicom_view_study")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleInfoClick(study)}
                      className="text-xs h-auto py-1 px-2"
                    >
                      <Info size={16} className="mr-1" />
                      Info
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleNewReportClick(study.external_id)}
                      className="text-xs h-auto py-1 px-2"
                    >
                      <FilePlusIcon size={16} className="mr-1" />
                      New Report
                    </Button>
                    {study.has_report &&
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditReport(study.external_id)}
                        className="text-xs h-auto py-1 px-2"
                      >
                        <Pencil size={16} className="mr-1" />
                        Edit Report
                      </Button>
                    }
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {showReportSelectModal && (
        <div className="fixed inset-0 bg-white/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-[760px] relative p-5 flex flex-col max-h-[80vh]">
            <button
              className="absolute top-3 right-3 text-gray-600 hover:text-red-600"
              onClick={() => setShowReportSelectModal(false)}
            >
              <X size={20} />
            </button>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-1">
                Multiple Reports Found
              </h3>
              <p className="text-sm text-gray-500">
                Select a report to edit, or create a new one.
              </p>
            </div>
            <div className="rounded-md border overflow-auto flex-1">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="px-4">#</TableHead>
                    <TableHead className="px-4">Modality</TableHead>
                    <TableHead className="px-4">Body Part</TableHead>
                    <TableHead className="px-4">Scan Protocol</TableHead>
                    <TableHead className="px-4">Created</TableHead>
                    <TableHead className="px-4">Last Modified</TableHead>
                    <TableHead className="px-4 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportSelectList.map((report, index) => (
                    <TableRow key={report.external_id}>
                      <TableCell className="px-4 text-gray-500 text-sm">{index + 1}</TableCell>
                      <TableCell className="px-4">{report.modality || "—"}</TableCell>
                      <TableCell className="px-4">{report.body_part || "—"}</TableCell>
                      <TableCell className="px-4">{report.scan_protocol || "—"}</TableCell>
                      <TableCell className="px-4">
                        {report.created_datetime
                          ? format(new Date(report.created_datetime), "dd MMM yyyy, hh:mm aa")
                          : "—"}
                      </TableCell>
                      <TableCell className="px-4">
                        {report.last_modified_datetime
                          ? format(new Date(report.last_modified_datetime), "dd MMM yyyy, hh:mm aa")
                          : "—"}
                      </TableCell>
                      <TableCell className="px-4 text-right">
                        <button
                          onClick={() => handleReportSelect(report.external_id)}
                          className="text-gray-600 hover:text-purple-600"
                          title="Edit report"
                        >
                          <Pencil size={18} />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end pt-4 border-t mt-4">
              <button
                onClick={() => {
                  setShowReportSelectModal(false);
                  setReportCreationStudyId(reportSelectStudyId);
                  setShowReportCreationModal(true);
                }}
                className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-md bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                <Plus size={15} />
                New Report
              </button>
            </div>
          </div>
        </div>
      )}

      {viewerStudyUid && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-7xl max-h-[95vh] overflow-auto">
            <DicomViewer
              studyUid={viewerStudyUid}
              embedded
              onClose={() => setViewerStudyUid(null)}
            />
          </div>
        </div>
      )}

      {showPreviewPanel && previewStudyId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
            <RadiologyReportPreview
              studyId={previewStudyId}
              serviceRequestId={serviceRequestId}
              facilityId={facilityId}
              onClose={() => {
                setShowPreviewPanel(false);
                setPreviewStudyId("");
              }}
            />
          </div>
        </div>
      )}

      {showModal && selectedStudy && (
        <div className="fixed inset-0 bg-white/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-[400px] relative p-5">
            <button
              className="absolute top-3 right-3 text-gray-600 hover:text-red-600"
              onClick={() => setShowModal(false)}
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {selectedStudy.study_description}{" "}
              {(selectedStudy.study_modalities as string[]).join(", ") || "—"}
            </h3>

            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-gray-100 rounded-md text-sm text-gray-700">
                {(selectedStudy.study_date
                  ? format(selectedStudy.study_date, "dd MMMM, yyyy")
                  : null) || "—"}
              </span>
              {selectedStudy.study_series.length > 0 && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md font-medium uppercase">
                  {(selectedStudy.study_modalities as string[]).join(", ") ||
                    "—"}
                </span>
              )}
            </div>

            <div className="border rounded-lg p-3 bg-gray-50">
              {selectedStudy.study_series.length > 0 ? (
                selectedStudy.study_series.map((series) => (
                  <div
                    key={series.series_uid}
                    className="flex justify-between text-sm text-gray-800 py-1"
                  >
                    <span>{series.series_description || "—"}</span>
                    <span>{series.series_instance_count || "—"}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No series found</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Creation Modal */}
      {showReportCreationModal && reportCreationStudyId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
            <DicomReport
              facilityId={facilityId}
              serviceRequestId={serviceRequestId}
              studyUid={reportCreationStudyId}
              onClose={handleCloseReportModal}
              onSaveSuccess={() => handleReportSaved(reportCreationStudyId)}
            />
          </div>
        </div>
      )}
    </React.Fragment>
  );
};

export default RadiologyStudyTable;
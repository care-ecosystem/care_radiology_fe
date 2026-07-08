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
import { Eye, FileText, Info, X, FilePlusIcon } from "lucide-react";
import { format } from "date-fns";
import React from "react";
// import { apis } from "@/apis";
import { PLUGIN_SLUG } from "@/constants";
import { useTranslation } from "react-i18next";
import DicomReport from "./DicomReport";
import RadiologyReportPreview from "@/components/Study/RadiologyReportPreview";
import { Button } from "./ui/button";
import { Dialog, DialogContent } from "./ui/dialog";


type RadiologyStudyTableProps = { className?: string, studies: DicomStudy[] };
export const RadiologyStudyTable: FC<RadiologyStudyTableProps> = (props) => {
  const { t } = useTranslation(PLUGIN_SLUG);

  const [showModal, setShowModal] = useState(false);
  const [selectedStudy, setSelectedStudy] = useState<DicomStudy | null>(null);
  const [viewerStudyUid, setViewerStudyUid] = useState<string | null>(null);

  const [showPreviewPanel, setShowPreviewPanel] = useState(false);

  const [previewStudyId, setPreviewStudyId] = useState<string>("");

  const [showEditReportModal, setShowEditReportModal] = useState(false);
  const [editReportStudyId, setEditReportStudyId] = useState<string>("");
  const [editReportId, setEditReportId] = useState<string>("");


  
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

  const handleEditFromPreview = (studyId: string, reportId: string) => {
    setShowPreviewPanel(false);
    setPreviewStudyId("");
    setEditReportStudyId(studyId);
    setEditReportId(reportId);
    setShowEditReportModal(true);
  };

  const handleCloseEditReportModal = () => {
    setShowEditReportModal(false);
    setEditReportStudyId("");
    setEditReportId("");
  };


  const handleViewStudy = (studyUid: string) => {
    setViewerStudyUid(studyUid);
  }

  const handleNewReportClick = (studyId: string) => {
    setReportCreationStudyId(studyId);
    setShowReportCreationModal(true);
  };

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
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
              onEdit={handleEditFromPreview}
            />
          </div>
        </div>
      )}

      <Dialog open={showEditReportModal} onOpenChange={(open) => {
        if (!open) {
          handleCloseEditReportModal();
        }
      }}>
        <DialogContent
          className="max-w-6xl w-full h-[85vh] flex flex-col p-0 overflow-hidden gap-0"
          hideClose
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          {editReportStudyId && (
            <DicomReport
              facilityId={facilityId}
              serviceRequestId={serviceRequestId}
              studyUid={editReportStudyId}
              reportId={editReportId}
              onClose={() => {
                setShowEditReportModal(false);
                setEditReportStudyId("");
                setEditReportId("");
              }}
              onSaveSuccess={() => handleReportSaved(editReportStudyId)}
              onBack={() => {
                setShowEditReportModal(false);
                setEditReportStudyId("");
                setEditReportId("");
                
                setTimeout(() => {
                  setPreviewStudyId(editReportStudyId);
                  setShowPreviewPanel(true);
                }, 300); 
              }}
            />
          )}
        </DialogContent>
      </Dialog>

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
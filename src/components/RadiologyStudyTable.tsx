import { DicomStudy } from "@/types/dicom";
import { FC, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Eye, Info, X } from "lucide-react";
import { format } from "date-fns";
import React from "react";
import { PLUGIN_SLUG } from "@/constants";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";


type RadiologyStudyTableProps = {
  className?: string,
  studies?: DicomStudy[],
};

export const RadiologyStudyTable: FC<RadiologyStudyTableProps> = ({ className, studies }) => {
  const { t } = useTranslation(PLUGIN_SLUG);

  const [showModal, setShowModal] = useState(false);
  const [selectedStudy, setSelectedStudy] = useState<DicomStudy | null>(null);

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

  const handleViewStudy = (studyUid: string) => {
    window.open(
      `/facility/${facilityId}/service_requests/${serviceRequestId}/radiology/view/${studyUid}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <React.Fragment>
      <div className={`${className ?? ''} rounded-md border`}>
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
            {studies?.map((study: DicomStudy) => (
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
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
    </React.Fragment>
  );
};

export default RadiologyStudyTable;
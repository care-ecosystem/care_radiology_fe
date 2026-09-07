import { DicomStudy } from "@/types/dicom";
import { FC, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, Info } from "lucide-react";
import { format } from "date-fns";
import { PLUGIN_SLUG } from "@/constants";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";


type RadiologyStudyTableProps = {
  className?: string,
  studies?: DicomStudy[],
};

export const RadiologyStudyTable: FC<RadiologyStudyTableProps> = ({ className, studies }) => {
  const { t } = useTranslation(PLUGIN_SLUG);

  const [selectedStudy, setSelectedStudy] = useState<DicomStudy | null>(null);
  const selectedModalities =
    (selectedStudy?.study_modalities as string[] | undefined)?.join(", ") ||
    "—";

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
    <>
      <div className={`${className ?? ''} rounded-md border`}>
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100">
              <TableHead>{t("radiology_study_name")}</TableHead>
              <TableHead>{t("radiology_study_date")}</TableHead>
              <TableHead>{t("radiology_study_modality")}</TableHead>
              <TableHead className="text-right">
                {t("radiology_actions")}
              </TableHead>
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
                      onClick={() => setSelectedStudy(study)}
                      className="text-xs h-auto py-1 px-2"
                    >
                      <Info size={16} className="mr-1" />
                      {t("radiology_info")}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={!!selectedStudy}
        onOpenChange={(open) => !open && setSelectedStudy(null)}
      >
        <DialogContent className="max-w-[400px]">
          {selectedStudy && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selectedStudy.study_description} {selectedModalities}
                </DialogTitle>
              </DialogHeader>

              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-gray-100 rounded-md text-sm text-gray-700">
                  {(selectedStudy.study_date
                    ? format(selectedStudy.study_date, "dd MMMM, yyyy")
                    : null) || "—"}
                </span>
                {selectedStudy.study_series.length > 0 && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md font-medium uppercase">
                    {selectedModalities}
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
                  <p className="text-gray-500 text-sm">
                    {t("radiology_no_series_found")}
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RadiologyStudyTable;
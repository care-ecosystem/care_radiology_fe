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
import { Archive, Eye, Info, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { PLUGIN_SLUG } from "@/constants";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { apis } from "@/apis";
import { toast } from "@/lib/utils";


type RadiologyStudyTableProps = {
  className?: string,
  studies?: DicomStudy[],
  canArchive?: boolean,
  onArchived?: () => void,
};

export const RadiologyStudyTable: FC<RadiologyStudyTableProps> = ({
  className,
  studies,
  canArchive = false,
  onArchived,
}) => {
  const { t } = useTranslation(PLUGIN_SLUG);

  const [selectedStudy, setSelectedStudy] = useState<DicomStudy | null>(null);
  const [studyToArchive, setStudyToArchive] = useState<DicomStudy | null>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [isArchiving, setIsArchiving] = useState(false);
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

  const closeArchiveDialog = () => {
    setStudyToArchive(null);
    setArchiveReason("");
  };

  const handleArchive = async () => {
    if (!studyToArchive) return;

    const reason = archiveReason.trim();
    if (!reason) {
      toast.warning(t("radiology_please_enter_archive_reason"));
      return;
    }

    setIsArchiving(true);
    try {
      await apis.dicom.archive(studyToArchive.external_id, {
        archive_reason: reason,
      });
      toast.success(t("radiology_study_archived_successfully"));
      closeArchiveDialog();
      onArchived?.();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("radiology_failed_to_archive_study"),
      );
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <>
      <div className={`${className ?? ''} min-w-0 overflow-hidden rounded-md border`}>
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100">
              <TableHead className="whitespace-nowrap">
                {t("radiology_study_name")}
              </TableHead>
              <TableHead className="whitespace-nowrap">
                {t("radiology_study_date")}
              </TableHead>
              <TableHead className="whitespace-nowrap">
                {t("radiology_study_modality")}
              </TableHead>
              <TableHead className="text-right whitespace-nowrap">
                {t("radiology_actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {studies?.map((study: DicomStudy) => (
              <TableRow key={study.external_id}>
                <TableCell className="font-medium">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{study.study_description || "—"}</span>
                    {study.is_archived && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                        <Archive size={12} />
                        {t("radiology_archived")}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {(study.study_date
                    ? format(study.study_date, "dd MMMM, yyyy")
                    : null) || "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {(study.study_modalities as string[])?.join(", ") || "—"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2 items-center justify-end whitespace-nowrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewStudy(study.study_uid)}
                      className="text-xs h-auto py-1 px-2"
                    >
                      <Eye size={16} className="mr-1" />
                      {t("dicom_view_study")}
                    </Button>
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-auto py-1 px-2"
                          aria-label={t("radiology_more_options")}
                        >
                          <MoreHorizontal size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => setSelectedStudy(study)}
                        >
                          <Info size={16} />
                          {t("radiology_info")}
                        </DropdownMenuItem>
                        {canArchive && !study.is_archived && (
                          <DropdownMenuItem
                            onSelect={() => setStudyToArchive(study)}
                          >
                            <Archive size={16} />
                            {t("radiology_archive")}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-sm">
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

      <Dialog
        open={!!studyToArchive}
        onOpenChange={(open) => !open && closeArchiveDialog()}
      >
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("radiology_archive_study")}</DialogTitle>
            <DialogDescription>
              {t("radiology_archive_study_description", {
                study:
                  studyToArchive?.study_description ||
                  studyToArchive?.study_uid,
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="archive-reason">
              {t("radiology_archive_reason")}
            </Label>
            <textarea
              id="archive-reason"
              rows={3}
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              placeholder={t("radiology_enter_archive_reason")}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-xs placeholder:text-gray-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-gray-950 disabled:opacity-50"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={closeArchiveDialog}
              disabled={isArchiving}
            >
              {t("radiology_cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleArchive}
              loading={isArchiving}
              disabled={!archiveReason.trim()}
            >
              {t("radiology_archive")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RadiologyStudyTable;
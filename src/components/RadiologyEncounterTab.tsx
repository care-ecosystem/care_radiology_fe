import { FC, useEffect, useState } from "react";
import { EncounterTabProps } from "@/types/encounterTab";
import { useTranslation } from "react-i18next";
import { Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Pagination from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/lib/utils";
import RadiologyStudyTable from "./RadiologyStudyTable";
import { DicomStudy } from "@/types/dicom";
import { PLUGIN_SLUG } from "@/constants";
import { useRadiologyPermissions } from "@/hooks/useRadiologyPermissions";
import {
  encounterImagingStudiesQueryKey,
  imagingStudyQueryKey,
  toDicomStudies,
  useEncounterImagingStudies,
} from "@/hooks/useRadiologyStudies";
import EncounterDicomUploadDialog from "./EncounterDicomUploadDialog";

// Same Unicons paths the host's CareIcon uses for the Files tab filter.
const CARE_ICON_PATHS = {
  "l-filter":
    "M19,2H5A3,3,0,0,0,2,5V6.17a3,3,0,0,0,.25,1.2l0,.06a2.81,2.81,0,0,0,.59.86L9,14.41V21a1,1,0,0,0,.47.85A1,1,0,0,0,10,22a1,1,0,0,0,.45-.11l4-2A1,1,0,0,0,15,19V14.41l6.12-6.12a2.81,2.81,0,0,0,.59-.86l0-.06A3,3,0,0,0,22,6.17V5A3,3,0,0,0,19,2ZM13.29,13.29A1,1,0,0,0,13,14v4.38l-2,1V14a1,1,0,0,0-.29-.71L5.41,8H18.59ZM20,6H4V5A1,1,0,0,1,5,4H19a1,1,0,0,1,1,1Z",
  "l-times-circle":
    "M15.71,8.29a1,1,0,0,0-1.42,0L12,10.59,9.71,8.29A1,1,0,0,0,8.29,9.71L10.59,12l-2.3,2.29a1,1,0,0,0,0,1.42,1,1,0,0,0,1.42,0L12,13.41l2.29,2.3a1,1,0,0,0,1.42,0,1,1,0,0,0,0-1.42L13.41,12l2.3-2.29A1,1,0,0,0,15.71,8.29Zm3.36-3.36A10,10,0,1,0,4.93,19.07,10,10,0,1,0,19.07,4.93ZM17.66,17.66A8,8,0,1,1,20,12,7.95,7.95,0,0,1,17.66,17.66Z",
} as const;

const CareIcon: FC<{
  icon: keyof typeof CARE_ICON_PATHS;
  className?: string;
}> = ({ icon, className }) => (
  <svg
    className={`care-${icon} care-svg-icon__baseline ${className ?? ""}`.trim()}
    role="img"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
  >
    <path d={CARE_ICON_PATHS[icon]} fill="currentColor" />
  </svg>
);

const RADIOLOGY_TAB_KEY = "radiology";
const IMAGING_STUDIES_PAGE_SIZE = 14;
const notifiedToasts = new Set<string>();

const DICOM_UPLOAD_ALLOWED_ENCOUNTER_STATUSES = new Set([
  "planned",
  "in_progress",
]);

const isRadiologyTabOpen = () =>
  window.location.pathname.split("/").filter(Boolean).pop() ===
  RADIOLOGY_TAB_KEY;

const toastOncePerVisit = (key: string, message: string) => {
  if (!isRadiologyTabOpen() || notifiedToasts.has(key)) return;
  notifiedToasts.add(key);
  toast.error(message);
};

export const RadiologyEncounterTab: FC<EncounterTabProps> = ({
  encounter,
  patient,
}) => {
  const { t } = useTranslation(PLUGIN_SLUG);
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(0);
  // undefined = no filter (all studies, no badge), like the Files tab.
  const [archivedFilter, setArchivedFilter] = useState<boolean>();
  const [showUploader, setShowUploader] = useState(false);
  const facilityId = encounter.facility?.id;
  const {
    canReadRadiology,
    canWriteRadiology,
    isLoading: isPermissionLoading,
    isError: isPermissionError,
  } = useRadiologyPermissions(facilityId);
  const encounterStudiesQueryKey = encounterImagingStudiesQueryKey(
    patient.id,
    encounter.id,
  );
  const {
    data: imagingStudies,
    isLoading,
    isError,
  } = useEncounterImagingStudies(patient.id, encounter.id, {
    enabled: canReadRadiology,
    limit: IMAGING_STUDIES_PAGE_SIZE,
    offset: page * IMAGING_STUDIES_PAGE_SIZE,
    isArchived: archivedFilter,
  });
  const totalImagingStudies = imagingStudies?.count ?? 0;
  const dicomStudies = imagingStudies?.results.flatMap(toDicomStudies);

  const handleUploadSuccess = () => {
    queryClient.invalidateQueries({ queryKey: encounterStudiesQueryKey });
    queryClient.invalidateQueries({
      queryKey: imagingStudyQueryKey(patient.id).slice(0, 2),
    });
  };

  useEffect(
    () => () => {
      if (!isRadiologyTabOpen()) notifiedToasts.clear();
    },
    [],
  );

  const hasRadiologyAccess = canReadRadiology || canWriteRadiology;
  const isUploadAllowedForEncounterStatus =
    !!encounter.status &&
    DICOM_UPLOAD_ALLOWED_ENCOUNTER_STATUSES.has(encounter.status);
  const canUploadDicom =
    canWriteRadiology && !!facilityId && isUploadAllowedForEncounterStatus;

  useEffect(() => {
    if (hasRadiologyAccess || isPermissionLoading) return;
    if (isPermissionError) {
      toastOncePerVisit(
        "permission_check_failed",
        t("radiology_permission_check_failed"),
      );
    } else {
      toastOncePerVisit("no_permission", t("radiology_no_permission"));
    }
  }, [isPermissionLoading, isPermissionError, hasRadiologyAccess, t]);

  useEffect(() => {
    if (isError) {
      toastOncePerVisit("load_failed", t("radiology_failed_to_load_studies"));
    }
  }, [isError, t]);

  const searchTerm = searchInput.trim().toLowerCase();
  const filteredStudies = dicomStudies?.filter((s: DicomStudy) => {
    if (!searchTerm) return true;
    return [s.study_description, s.accession_number].some((value) =>
      value?.toLowerCase().includes(searchTerm),
    );
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  if (isPermissionLoading) return null;

  if (!hasRadiologyAccess && isPermissionError) {
    return (
      <EmptyState
        className="h-full min-h-96"
        title={t("radiology_permission_check_failed_title")}
        description={t("radiology_permission_check_failed_description")}
      />
    );
  }

  if (!hasRadiologyAccess) {
    return (
      <EmptyState
        className="h-full min-h-96"
        title={t("radiology_no_access_title")}
        description={t("radiology_no_access_description")}
      />
    );
  }

  return (
    <div className="py-4">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        {canReadRadiology && (
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4" />
            <Input
              placeholder={t("dicom_search_by_study_name_or_accession_number")}
              className="pl-10 focus-visible:ring-1"
              value={searchInput}
              onChange={handleSearch}
            />
          </div>
        )}
        {canReadRadiology && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                className="text-sm font-semibold text-secondary-800"
              >
                <span className="flex flex-row items-center gap-1">
                  <CareIcon icon="l-filter" />
                  <span>{t("radiology_filter")}</span>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-max">
              {[false, true].map((archived) => (
                <DropdownMenuItem
                  key={String(archived)}
                  className="text-primary-900 whitespace-nowrap"
                  onSelect={() => {
                    setArchivedFilter(archived);
                    setPage(0);
                  }}
                >
                  {t(
                    archived
                      ? "radiology_archived_studies"
                      : "radiology_active_studies",
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {canUploadDicom && (
          <Button
            variant="primary"
            className="ml-auto"
            onClick={() => setShowUploader(true)}
          >
            <Plus className="size-4 mr-1" />
            {t("dicom_upload_data")}
          </Button>
        )}
      </div>

      {archivedFilter !== undefined && (
        <div className="flex flex-row gap-2 mt-2 mx-2 mb-4">
          <Badge
            variant="outline"
            className="cursor-pointer"
            onClick={() => {
              setArchivedFilter(undefined);
              setPage(0);
            }}
          >
            {t(
              archivedFilter
                ? "radiology_archived_studies"
                : "radiology_active_studies",
            )}
            <CareIcon icon="l-times-circle" className="ml-1" />
          </Badge>
        </div>
      )}

      {canUploadDicom && (
        <EncounterDicomUploadDialog
          open={showUploader}
          onClose={() => setShowUploader(false)}
          patientId={patient.id}
          encounterId={encounter.id}
          onUploadSuccess={handleUploadSuccess}
        />
      )}

      {!canReadRadiology ? (
        <EmptyState
          className="min-h-64"
          title={t("radiology_no_access_title")}
          description={t("radiology_no_access_description")}
        />
      ) : isLoading ? (
        <div className="grid gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : filteredStudies && filteredStudies.length > 0 ? (
        <RadiologyStudyTable
          studies={filteredStudies}
          canArchive={canWriteRadiology}
          onArchived={handleUploadSuccess}
          patientId={patient.id}
        />
      ) : (
        <Card className="col-span-full">
          <CardContent className="p-6 text-center text-gray-500">
            {t("dicom_no_studies_found")}
          </CardContent>
        </Card>
      )}

      {canReadRadiology && totalImagingStudies > IMAGING_STUDIES_PAGE_SIZE && (
        <Pagination
          data={{ totalCount: totalImagingStudies }}
          onChange={(nextPage) => setPage(nextPage - 1)}
          defaultPerPage={IMAGING_STUDIES_PAGE_SIZE}
          cPage={page + 1}
        />
      )}
    </div>
  );
};

export default RadiologyEncounterTab;

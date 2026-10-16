import { FC, useEffect, useState } from "react";
import { EncounterTabProps } from "@/types/encounterTab";
import { useTranslation } from "react-i18next";
import { Plus, Search } from "lucide-react";
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

const RADIOLOGY_TAB_KEY = "radiology";
const IMAGING_STUDIES_PAGE_SIZE = 14;
const notifiedToasts = new Set<string>();

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

  const filteredStudies = dicomStudies?.filter((s: DicomStudy) => {
    if (!searchInput) return true;
    return (s?.study_description ?? ("" as string))
      ?.toLowerCase()
      .includes(searchInput);
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
              placeholder={t("dicom_search_records")}
              className="pl-10 focus-visible:ring-1"
              value={searchInput}
              onChange={handleSearch}
            />
          </div>
        )}
        {canWriteRadiology && facilityId && (
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

      {canWriteRadiology && facilityId && (
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
        <RadiologyStudyTable studies={filteredStudies} patientId={patient.id} />
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

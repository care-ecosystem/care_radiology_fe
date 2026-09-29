import { FC, useEffect, useState } from "react";
import { EncounterTabProps } from "@/types/encounterTab";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { apis } from "@/apis";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/lib/utils";
import RadiologyStudyTable from "./RadiologyStudyTable";
import { DicomStudy } from "@/types/dicom";
import { PLUGIN_SLUG } from "@/constants";
import { useRadiologyPermissions } from "@/hooks/useRadiologyPermissions";

const RADIOLOGY_TAB_KEY = "radiology";
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
  const [searchInput, setSearchInput] = useState("");
  const { canReadRadiology, isLoading: isPermissionLoading } =
    useRadiologyPermissions(encounter.facility?.id);
  const {
    data: dicomStudies,
    isLoading,
    isError,
  } = useQuery<DicomStudy[]>({
    queryKey: ["dicomimagelist", encounter.id],
    queryFn: () =>
      apis.dicom.fetchStudies({
        encounter: encounter.id,
        includeArchived: false,
      }),
    enabled: canReadRadiology,
  });

  useEffect(
    () => () => {
      if (!isRadiologyTabOpen()) notifiedToasts.clear();
    },
    [],
  );

  useEffect(() => {
    if (!isPermissionLoading && !canReadRadiology) {
      toastOncePerVisit("no_permission", t("radiology_no_permission"));
    }
  }, [isPermissionLoading, canReadRadiology, t]);

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

  if (!canReadRadiology) {
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
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4" />
          <Input
            placeholder={t("dicom_search_records")}
            className="pl-10 focus-visible:ring-1"
            value={searchInput}
            onChange={handleSearch}
          />
        </div>
      </div>

      {isLoading ? (
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
    </div>
  );
};

export default RadiologyEncounterTab;

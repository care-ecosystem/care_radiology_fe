import { FC, useState } from "react";
import { EncounterTabProps } from "../types/encounterTab";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import { Plus, Search } from "lucide-react";
import { navigate } from "raviger";
import { Input } from "./ui/input";
import { useQuery } from "@tanstack/react-query";
import { apis } from "@/apis";
import { Card, CardContent } from "./ui/card";
import RadiologyStudyTable from "./RadiologyStudyTable";
import { DicomStudy } from "@/types/dicom";
import { PLUGIN_SLUG } from "@/constants";

export const RadiologyEncounterTab: FC<EncounterTabProps> = ({
  patient,
  encounter,
}) => {
  const { t } = useTranslation(PLUGIN_SLUG);
  const [searchInput, setSearchInput] = useState("");
  const {
    data: dicomStudies,
    isLoading,
    error,
  } = useQuery<DicomStudy[]>({
    queryKey: ["dicomimagelist", patient.id],
    queryFn: () =>
      apis.dicom.fetchStudies({
        facility: encounter.facility.id,
        patient: patient.id,
      }),
    enabled: true,
  });

  const filteredStudies = dicomStudies?.filter((s: DicomStudy) => {
    if (!searchInput) return true;
    return (s?.study_description ?? ("" as string))
      ?.toLowerCase()
      .includes(searchInput);
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  const handleDicomUploadNavigation = () => {
    const facilityId = encounter.facility.id;

    // Need logic to find out service request id
    const serviceRequestId = ":serviceRequestId";
    
    navigate(`/facility/${facilityId}/patient/${patient.id}/service_requests/${serviceRequestId}/radiology/uploader`)
  }

  console.log("DATA ", dicomStudies, isLoading, error);
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
        <Button
          variant="primary"
          onClick={handleDicomUploadNavigation}
        >
          <Plus className="size-4 mr-1" />
          {t("dicom_upload_data")}
        </Button>
      </div>

      {filteredStudies && filteredStudies.length > 0 ? (
        <RadiologyStudyTable studies={filteredStudies} />
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

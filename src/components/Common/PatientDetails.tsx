import { Patient } from "@/types/patient";
import { Card } from "../ui/card";
import { format } from "date-fns";
import { User } from "@/types/User";
import { formatName } from "@/utils/auditUtils";
import { DicomStudy } from "@/types/Dicom";
import { formatPatientAge } from "@/utils/formatPatientAge";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";

interface PatientDetailsProps {
  patient: Patient | null;
  requester: User | null;
  dicomStudy: DicomStudy | null;
  departments: any[];
  onInfoClick?: () => void;
}


export default function PatientDetails({
  patient,
  requester,
  dicomStudy,
  departments,
  onInfoClick
}: PatientDetailsProps) {

  const { t: basetranslate } = useTranslation();

  const doctorName = formatName(requester);
  const departmentNames = departments.map(dept => dept.name).join(" · ")

  const patientUHID = patient?.id?.slice(0, 5) ?? "-";
  const patientAgeGender = patient
    ? `${formatPatientAge(patient, true)}, ${basetranslate(`GENDER__${patient.gender}`)}`
    : "-";

  return (
    <Card className="mb-4 bg-gray-50/30 w-full overflow-visible">
      <div className="flex flex-row gap-6 p-4 text-sm border-b bg-white w-full">
        {/* Patient Name & Demographics */}
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="text-gray-500 text-xs font-medium uppercase tracking-wide">
            PATIENT
          </span>
          <span className="font-semibold text-gray-900 text-base">
            {patient?.name}
          </span>
          <span className="text-gray-600 text-sm">
            {patientAgeGender} · UHID {patientUHID}
          </span>
        </div>

        {/* Study Date & Time */}
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="text-gray-500 text-xs font-medium uppercase tracking-wide">
            STUDY DATE
          </span>
          <span className="font-semibold text-gray-900">
            {(dicomStudy?.study_date
              ? format(dicomStudy.study_date, "dd MMMM, yyyy")
              : null) || "—"}
          </span>
          <span className="text-gray-600">
            {(dicomStudy?.study_date
              ? format(dicomStudy.study_date, "hh:mm aa")
              : null) || "-"}
          </span>
        </div>

        {/* Referring Physician & Department */}
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="text-gray-500 text-xs font-medium uppercase tracking-wide">
            REFERRING PHYSICIAN
          </span>
          <span className="font-semibold text-gray-900">{doctorName}</span>
          <span className="text-gray-600">{departmentNames}</span>
        </div>

        {/* Accession Number */}
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="text-gray-500 text-xs font-medium uppercase tracking-wide">
            ACCESSION #
          </span>
          <span className="font-semibold text-gray-900">ACC-2026-005821</span>
        </div>

        {/* Report Status */}
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="text-gray-500 text-xs font-medium uppercase tracking-wide">
            STATUS
          </span>
          <span className="inline-flex items-center gap-2 mt-1">
            <span className="px-3 py-1 rounded-md bg-yellow-100 text-yellow-800 text-sm font-medium">
              Pending Report
            </span>
            {onInfoClick && (
              <Info
                size={18}
                className="ml-6 cursor-pointer text-gray-400 hover:text-green-600 "
                onClick={onInfoClick}
              />
            )}
          </span>
        </div>
      </div>
    </Card>
  );
}

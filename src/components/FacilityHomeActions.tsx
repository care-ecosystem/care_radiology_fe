import { FC } from "react";
import { navigate } from "raviger";
import { useTranslation } from "react-i18next";
import { ClipboardList } from "lucide-react";

import { PLUGIN_SLUG } from "@/constants";
import { Facility } from "@/types/facility";

type FacilityHomeActionsProps = {
  facility: Facility;
  className?: string;
};

const FacilityHomeActions: FC<FacilityHomeActionsProps> = ({ facility }) => {
  const { t } = useTranslation(PLUGIN_SLUG);

  if (!facility?.id) return null;

  return (
    <button
      type="button"
      onClick={() =>
        navigate(`/facility/${facility.id}/settings/general/report_templates`)
      }
      className="flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden hover:bg-gray-100 hover:text-gray-900 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
    >
      <ClipboardList className="size-4 text-gray-500" />
      {t("radiology_manage_report_templates")}
    </button>
  );
};

export default FacilityHomeActions;

import dayjs from "dayjs";
import type { TFunction } from "i18next";

export const formatPatientAge = (patient: any, t: TFunction) => {
  if (!patient) return "-";

  const start = patient.date_of_birth
    ? dayjs(new Date(patient.date_of_birth))
    : patient.year_of_birth
      ? dayjs(new Date(patient.year_of_birth, 0, 1))
      : null;

  if (!start) return "-";

  const end = dayjs();

  const years = end.diff(start, "years");
  if (years > 0) {
    return t("radiology_age_years", { count: years });
  }

  if (!patient.date_of_birth) {
    return t("radiology_age_born_on", { year: patient.year_of_birth });
  }

  const months = end.diff(start, "month");
  const days = end.diff(start.add(months, "month"), "day");

  if (months > 0) {
    return `${t("radiology_age_months", { count: months })} ${t("radiology_age_days", { count: days })}`;
  }

  return t("radiology_age_days", { count: days });
};

import { Facility } from "./facility";
import { Patient } from "./patient";

// Mirrors care_fe's EncounterStatus enum (not importable here).
export const EncounterStatus = {
  planned: "planned",
  in_progress: "in_progress",
  on_hold: "on_hold",
  discharged: "discharged",
  completed: "completed",
  cancelled: "cancelled",
  discontinued: "discontinued",
  entered_in_error: "entered_in_error",
  unknown: "unknown",
} as const;

export type EncounterStatus =
  (typeof EncounterStatus)[keyof typeof EncounterStatus];

export type Encounter = {
  id: string;
  patient: Patient;
  facility: Facility;
  status?: EncounterStatus;

  [key: string]: unknown;
};

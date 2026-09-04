import { Encounter } from "./encounter";
import { Patient } from "./patient";

export type EncounterTabProps = {
  encounter: Encounter;
  patient: Patient;
  facilityId: string;
};

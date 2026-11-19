import { Facility } from "./facility";
import { Patient } from "./patient";

export type Encounter = {
  id: string;
  patient: Patient;
  facility: Facility;
  status?: string;

  [key: string]: unknown;
};

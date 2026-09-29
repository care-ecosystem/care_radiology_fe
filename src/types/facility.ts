export interface Facility {
  id: string;
  [key: string]: unknown;
}

// Facility retrieve returns the current user's permission slugs in this facility
export interface FacilityWithPermissions extends Facility {
  permissions: string[];
}

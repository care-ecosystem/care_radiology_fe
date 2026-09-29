import { useQuery } from "@tanstack/react-query";
import { apis } from "@/apis";
import { PLUGIN_SLUG } from "@/constants";

// Slugs registered by care_radiology's RadiologyPermissions
export const RADIOLOGY_PERMISSIONS = {
  read: "can_read_radiology_data",
  write: "can_write_radiology_data",
} as const;

const STALE_TIME = 5 * 60 * 1000;

/**
 * Resolves the current user's radiology permissions in a facility, matching the
 * backend's check_permission_in_facility_organization (superusers always pass).
 * Both flags stay false until resolved, so gated UI never flashes in.
 */
export function useRadiologyPermissions(facilityId?: string) {
  const { data: currentUser, isLoading: isUserLoading } = useQuery({
    queryKey: [PLUGIN_SLUG, "currentUser"],
    queryFn: apis.user.current,
    staleTime: STALE_TIME,
  });

  const { data: facility, isLoading: isFacilityLoading } = useQuery({
    queryKey: [PLUGIN_SLUG, "facility", facilityId],
    queryFn: () => apis.facility.retrieve(facilityId!),
    enabled: !!facilityId,
    staleTime: STALE_TIME,
  });

  const hasPermission = (permission: string) =>
    !!currentUser?.is_superuser ||
    (facility?.permissions ?? []).includes(permission);

  return {
    canReadRadiology: hasPermission(RADIOLOGY_PERMISSIONS.read),
    canWriteRadiology: hasPermission(RADIOLOGY_PERMISSIONS.write),
    isLoading: isUserLoading || (!!facilityId && isFacilityLoading),
  };
}

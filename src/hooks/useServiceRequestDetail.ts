import { useQuery } from "@tanstack/react-query";
import { apis } from "@/apis";
import { ServiceRequest } from "@/types/serviceRequest";

export function useServiceRequestDetail(
  facilityId?: string,
  serviceRequestId?: string,
) {
  return useQuery<ServiceRequest>({
    queryKey: ["serviceRequest", facilityId, serviceRequestId],
    queryFn: () => apis.servicerequest.retrieve(facilityId!, serviceRequestId!),
    enabled: !!facilityId && !!serviceRequestId,
  });
}

import {
  FormEvent,
  ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PLUGIN_SLUG } from "@/constants";
import { apis } from "@/apis";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AE_TITLE_MAX_LENGTH,
  AE_TITLE_PATTERN,
  CareDevice,
  DICOM_ENABLER_CARE_TYPE,
  DicomEnablerDeviceMetadata,
  isIpv4Address,
  ModalityAssignmentStatus,
  PORT_MAX,
  PORT_MIN,
  PORT_PATTERN,
} from "@/types/modalityDevice";
import { debounced } from "@/utils/query";

const DICOM_ENABLER_SEARCH_LIMIT = 14;

// Props the CARE device form passes to a configure form
export type DeviceConfigureFormProps = {
  facilityId: string;
  metadata: Record<string, unknown>;
  onChange: (metadata: Record<string, unknown>) => void;
};

// Props the CARE device page passes to a show page card
export type DeviceShowPageCardProps = {
  facilityId: string;
  device: {
    id: string;
    care_metadata: Record<string, unknown>;
  };
};

type WithAssignmentStatus = { assignment_status?: ModalityAssignmentStatus };

export function withoutAssignmentStatus(
  metadata: WithAssignmentStatus,
): Record<string, unknown> {
  const rest: WithAssignmentStatus = { ...metadata };
  delete rest.assignment_status;
  return rest;
}

// The device form submits the stored care_metadata as is, so the status is
// dropped from it as soon as the edit form loads
export function useDropAssignmentStatus(
  metadata: WithAssignmentStatus,
  onChange: (metadata: Record<string, unknown>) => void,
) {
  useEffect(() => {
    if (metadata.assignment_status) {
      onChange(withoutAssignmentStatus(metadata));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metadata.assignment_status]);
}

function RequiredMark() {
  return <span className="text-red-500">*</span>;
}

function useRequiredError(
  required: boolean | undefined,
  isEmpty: boolean,
  invalidMessage?: string,
) {
  const { t } = useTranslation(PLUGIN_SLUG);
  const ref = useRef<HTMLInputElement>(null);
  const [shown, setShown] = useState(false);
  const isMissing = !!required && isEmpty;
  const message = isMissing
    ? t("radiology_field_required")
    : isEmpty
      ? ""
      : (invalidMessage ?? "");

  useEffect(() => {
    ref.current?.setCustomValidity(message);
  }, [message]);

  return {
    ref,
    message,
    error: !!message && shown,
    markTouched: () => setShown(true),
    onInvalid: (event: FormEvent<HTMLInputElement>) => {
      event.preventDefault();
      setShown(true);
    },
  };
}

function InfoTooltip({ label, text }: { label: string; text: string }) {
  const tooltipId = useId();
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-describedby={tooltipId}
        className="rounded-full text-gray-400 hover:text-gray-600 focus-visible:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
      >
        <Info aria-hidden="true" className="size-3" />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className="invisible absolute bottom-full left-0 z-50 mb-2 w-64 max-w-[calc(100vw-2rem)] rounded-md bg-gray-900 px-3 py-2 text-xs font-normal text-white shadow-md group-focus-within:visible group-hover:visible"
      >
        {text}
      </span>
    </span>
  );
}

function FieldLabel({
  htmlFor,
  label,
  required,
  error,
  tooltip,
}: {
  htmlFor?: string;
  label: string;
  required?: boolean;
  error: boolean;
  tooltip?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor} className={error ? "text-red-500" : undefined}>
        {label}
        {required && <RequiredMark />}
      </Label>
      {tooltip && <InfoTooltip label={label} text={tooltip} />}
    </div>
  );
}

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} className="text-sm text-red-500">
      {message}
    </p>
  );
}

// Label, required check and error for a field whose control is not a plain
// input (e.g. a ComboBox)
export function SelectField({
  label,
  required,
  isEmpty,
  tooltip,
  children,
}: {
  label: string;
  required?: boolean;
  isEmpty: boolean;
  tooltip?: string;
  children: ReactNode;
}) {
  const errorId = useId();
  const { ref, message, error, onInvalid } = useRequiredError(
    required,
    isEmpty,
  );
  return (
    <div className="relative grid gap-2">
      <FieldLabel
        label={label}
        required={required}
        error={error}
        tooltip={tooltip}
      />
      {children}
      <input
        ref={ref}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onInvalid={onInvalid}
      />
      {error && <FieldError id={errorId} message={message} />}
    </div>
  );
}

export function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
        {children}
      </div>
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  required,
  placeholder,
  disabled,
  maxLength,
  invalidMessage,
  tooltip,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  invalidMessage?: string;
  tooltip?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const { ref, message, error, markTouched, onInvalid } = useRequiredError(
    required,
    !value.trim(),
    invalidMessage,
  );
  return (
    <div className="grid gap-2">
      <FieldLabel
        htmlFor={id}
        label={label}
        required={required}
        error={error}
        tooltip={tooltip}
      />
      <Input
        ref={ref}
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={!onChange}
        aria-required={required}
        aria-invalid={error}
        aria-describedby={error ? errorId : undefined}
        maxLength={maxLength}
        onChange={(e) => {
          markTouched();
          onChange?.(e.target.value);
        }}
        onInvalid={onInvalid}
      />
      {error && <FieldError id={errorId} message={message} />}
    </div>
  );
}

// DICOM AE value: up to 16 printable ASCII characters, no backslash
export function AeTitleField({
  label,
  value,
  onChange,
  required,
  placeholder,
  tooltip,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  tooltip?: string;
}) {
  return (
    <TextField
      label={label}
      value={value}
      required={required}
      placeholder={placeholder}
      tooltip={tooltip}
      maxLength={AE_TITLE_MAX_LENGTH}
      onChange={(next) => {
        if (AE_TITLE_PATTERN.test(next)) onChange(next);
      }}
    />
  );
}

// IPv4 address, e.g. 192.168.1.40; spaces cannot be typed
export function Ipv4Field({
  label,
  value,
  onChange,
  placeholder,
  tooltip,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  tooltip?: string;
}) {
  const { t } = useTranslation(PLUGIN_SLUG);
  return (
    <TextField
      label={label}
      value={value}
      required
      placeholder={placeholder}
      tooltip={tooltip}
      maxLength={15}
      invalidMessage={
        isIpv4Address(value) ? undefined : t("radiology_invalid_ipv4")
      }
      onChange={(next) => onChange(next.replace(/\s/g, ""))}
    />
  );
}

// Port is sent as an integer (1-65535); undefined while the field is empty
export function PortField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
}) {
  const { t } = useTranslation(PLUGIN_SLUG);
  const isValid = value === undefined || (value >= PORT_MIN && value <= PORT_MAX);
  return (
    <TextField
      label={label}
      value={value?.toString() ?? ""}
      required
      placeholder={placeholder}
      maxLength={5}
      invalidMessage={isValid ? undefined : t("radiology_invalid_port")}
      onChange={(next) => {
        if (PORT_PATTERN.test(next))
          onChange(next ? parseInt(next, 10) : undefined);
      }}
    />
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <div className="text-sm break-all">{children}</div>
    </div>
  );
}

// Green dot when the device is assigned (synced), amber while it is waiting to be (pending sync)
export function SyncStatus({ status }: { status?: ModalityAssignmentStatus }) {
  const { t } = useTranslation(PLUGIN_SLUG);
  const isSynced = status === "assigned";
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={`size-2.5 rounded-full ${
          isSynced ? "bg-green-500" : "bg-amber-500"
        }`}
      />
      {isSynced
        ? t("radiology_modality_synced")
        : t("radiology_modality_not_synced")}
    </span>
  );
}

// The facility's DICOM Enablers whose name matches `search`, from the core CARE device list.
// The search runs on the server, debounced; the previous results stay shown while it loads.
export function useDicomEnablers(facilityId: string, search = "") {
  const term = search.trim();
  return useQuery({
    queryKey: ["radiology", "dicom-enablers", facilityId, term],
    queryFn: debounced(
      () =>
        apis.device.list(facilityId, {
          care_type: DICOM_ENABLER_CARE_TYPE,
          search_text: term || undefined,
          limit: DICOM_ENABLER_SEARCH_LIMIT,
        }),
      300,
    ),
    enabled: !!facilityId,
    placeholderData: keepPreviousData,
  });
}

// One DICOM Enabler by id, so it can be named even when it is not in the current search results
export function useDicomEnabler(facilityId: string, deviceId?: string | null) {
  return useQuery({
    queryKey: ["radiology", "dicom-enabler", facilityId, deviceId],
    queryFn: () => apis.device.retrieve(facilityId, deviceId!),
    enabled: !!facilityId && !!deviceId,
    // A deleted DICOM Enabler returns 404; show its id instead of retrying
    retry: false,
  });
}

// Name with the IP, e.g. "CT Room Gateway (192.168.1.40)"; just the name when no IP is set
export function dicomEnablerLabel(device: CareDevice) {
  const name = device.user_friendly_name || device.registered_name;
  const ip = (device.care_metadata as DicomEnablerDeviceMetadata).ip;
  return ip ? `${name} (${ip})` : name;
}

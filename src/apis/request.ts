import { CARE_ACCESS_TOKEN_LOCAL_STORAGE_KEY } from "@/constants";

// Mirrors care_fe's errorHandler.ts handlePydanticErrors: EMR resources
// serialize validation errors as {errors: [{type, loc?, msg}]}, where msg is
// either a plain string or a {field: message} object.
function extractErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const { detail, errors } = data as Record<string, unknown>;
  if (typeof detail === "string") return detail;
  const firstError = Array.isArray(errors) ? errors[0] : null;
  const msg = firstError?.msg;
  if (typeof msg === "string") return msg;
  if (msg && typeof msg === "object") {
    const value = Object.values(msg)[0];
    if (typeof value === "string") return value;
  }
  return null;
}

export class APIError extends Error {
  message: string;
  data: unknown;
  status: number;

  constructor(message: string, data: unknown, status: number) {
    super(message);
    this.name = "AbortError"; // this is required to skip error toasts by the core app, all the necessary errors are handled by the plug
    this.message = message;
    this.data = data;
    this.status = status;
  }
}

export async function request<Response>(
  path: string,
  options?: RequestInit,
  additionalOptions: { isFormdata: boolean } = { isFormdata: false }
): Promise<Response> {
  const url = `${(window as any).__CORE_ENV__?.apiUrl || ""}${path}`;

  const defaultHeaders: any = {
    Authorization: `Bearer ${localStorage.getItem(
      CARE_ACCESS_TOKEN_LOCAL_STORAGE_KEY
    )}`,
  };

  if (!additionalOptions.isFormdata) {
    defaultHeaders["Content-Type"] = "application/json";
  }

  const requestInit = {
    ...(options ?? {}),
    headers: {
      ...defaultHeaders,
      ...(options?.headers ?? {}),
    },
  };

  const response = await fetch(url, requestInit);

  let data = null;
  const contentType = response.headers.get("Content-Type");
  if (contentType?.includes("application/json")) {
    data = await response.json();
  } else if (contentType === "image/png") {
    data = await response.blob();
  }

  if (!response.ok) {
    if (response.status === 401) {
      // TODO: implement refresh token logic
    }

    throw new APIError(
      extractErrorMessage(data) ??
        (data ? JSON.stringify(data) : "Something went wrong"),
      data,
      response.status
    );
  }

  return data as Response;
}

export const queryString = (
  params?: Record<string, string | number | boolean>
) => {
  if (!params) {
    return "";
  }

  const paramString = Object.keys(params)
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return paramString ? `?${paramString}` : "";
};

export interface RadiologyPluginConfig {
  diagnosticReportResultsOverrideCategory?: string;
  allowDiagnosticReportWithoutActiveStudy?: boolean;
  [key: string]: unknown;
}

export interface PlugConfigMeta {
  url?: string;
  name?: string;
  radiologyViewerBaseUrl?: string;
  config?: RadiologyPluginConfig;
  [key: string]: unknown;
}

declare global {
  interface Window {
    CARE_API_URL: string;
    __CARE_PLUGIN_RUNTIME__?: { meta: Record<string, PlugConfigMeta> };
  }
}

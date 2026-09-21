import { PLUGIN_SLUG } from "@/constants";
import { PlugConfigMeta, RadiologyPluginConfig } from "@/types/plugin";


export function getPluginMeta(meta?: PlugConfigMeta) {
  return meta ?? window.__CARE_PLUGIN_RUNTIME__?.meta?.[PLUGIN_SLUG];
}

export function getPluginConfig(meta?: PlugConfigMeta): RadiologyPluginConfig {
  return getPluginMeta(meta)?.config ?? {};
}

export function allowsDiagnosticReportWithoutActiveStudy(
  meta?: PlugConfigMeta,
) {
  return (
    getPluginConfig(meta).allowDiagnosticReportWithoutActiveStudy !== false
  );
}

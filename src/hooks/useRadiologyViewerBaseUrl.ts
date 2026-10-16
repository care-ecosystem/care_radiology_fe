import { useQuery } from "@tanstack/react-query";
import { request } from "@/apis/request";
import { PLUGIN_SLUG } from "@/constants";
import { PlugConfigMeta } from "@/types/plugin";
import { getPluginMeta } from "@/utils/pluginConfig";

// The host loads the plugin from its build-time config before merging in the
// backend plug_config, so the runtime meta can lack radiologyViewerBaseUrl on
// first render. Fall back to the plug_config API when it is missing.
// Resolves to undefined while loading and "" when no base URL is configured.
export function useRadiologyViewerBaseUrl(): string | undefined {
  const runtimeBaseUrl = getPluginMeta()?.radiologyViewerBaseUrl;

  const { data, isError } = useQuery({
    queryKey: ["radiologyPlugConfig"],
    queryFn: () =>
      request<{ configs: { slug: string; meta: PlugConfigMeta }[] }>(
        "/api/v1/plug_config/",
      ),
    enabled: !runtimeBaseUrl,
    staleTime: Infinity,
  });

  if (runtimeBaseUrl) return runtimeBaseUrl;
  if (isError) return "";
  if (!data) return undefined;
  return (
    data.configs.find((config) => config.slug === PLUGIN_SLUG)?.meta
      ?.radiologyViewerBaseUrl ?? ""
  );
}

import { X } from "lucide-react";
import { formatDateTime } from "@/utils/auditUtils";
import { formatName } from "@/utils/auditUtils";
import { useState } from "react";
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";
import { useTranslation } from "react-i18next";

export default function RadiologyAuditPopup({
  open,
  onClose,
  audits,
}: {
  open: boolean;
  onClose: () => void;
  audits: any[];
}) {
  const [openLogIndex, setOpenLogIndex] = useState<number | null>(null);
  const { t } = useTranslation("care_radiology_fe");
  if (!open) return null;
  const createdLog = audits?.find((a) => a.action === "Created");
  const latestLog = audits?.[0];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        className="bg-white rounded-xl shadow-lg min-w-4xl max-w-4xl relative p-5 overflow-hidden"
        style={{ width: "900px" }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-black"
        >
          <X size={18} />
        </button>

        <h3 className="text-lg font-semibold mb-4">
          {t("radiology_audit_log")}
        </h3>

        {/* Created Info */}
        <div className="mb-3 border-b pb-2">
          <p className="text-sm text-gray-500">{t("radiology_created_by")}</p>
          <p className="text-sm font-medium">
            {formatName(createdLog?.created_by)}
          </p>
          <p className="text-xs text-gray-400">
            {formatDateTime(createdLog?.created_datetime)}
          </p>
        </div>

        {/* Updated Info */}
        <div className="mb-3 border-b pb-2">
          <p className="text-sm text-gray-500">
            {t("radiology_last_modified_by")}
          </p>
          <p className="text-sm font-medium">
            {formatName(latestLog?.updated_by)}
          </p>
          <p className="text-xs text-gray-400">
            {formatDateTime(latestLog?.last_modified_datetime)}
          </p>
        </div>

        {/* History Loop */}
        <div className="mt-4">
          <p className="font-medium text-sm mb-2">
            {t("radiology_modification_history")}
          </p>
          <div className="max-h-[300px] overflow-y-auto space-y-3 text-sm">
            {audits?.length > 0 ? (
              audits.map((log: any, idx: number) => {
                const isOpen = openLogIndex === idx;

                return (
                  <div key={idx} className="border rounded bg-gray-50">
                    {/* Header clickable */}
                    <div
                      className="p-3 cursor-pointer flex justify-between items-center hover:bg-gray-100"
                      onClick={() => setOpenLogIndex(isOpen ? null : idx)}
                    >
                      <div>
                        <p className="font-semibold text-sm">
                          {log.action}-{formatName(log.created_by)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDateTime(log.created_datetime)}
                        </p>
                      </div>
                      <span className="text-xs text-blue-600">
                        {isOpen ? "Hide" : "View"}
                      </span>
                    </div>

                    {/* Expandable Content */}
                    {isOpen && (
                      <div className="px-3 pb-3 text-xs space-y-2">
                        {/* UPDATED case: show comparison */}
                        {log.old_value && log.new_value
                          ? Object.keys(log.new_value).map((field) => (
                              <div key={field}>
                                <span className="font-medium">{field}:</span>{" "}
                                <div className="overflow-x-auto max-w-full">
                                  <ReactDiffViewer
                                    compareMethod={DiffMethod.WORDS}
                                    oldValue={log.old_value?.[field] ?? "-"}
                                    newValue={log.new_value?.[field] ?? "-"}
                                    splitView={false}
                                  />
                                </div>
                              </div>
                            ))
                          : /* CREATED case: show created data */
                            log.new_value &&
                            Object.keys(log.new_value).map((field) => (
                              <div key={field}>
                                <span className="font-medium">{field}:</span>{" "}
                                <span className="text-green-700">
                                  {log.new_value?.[field] ?? "-"}
                                </span>
                              </div>
                            ))}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-gray-400">
                {t("radiology_no_history_available")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

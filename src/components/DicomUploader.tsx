import { ScrollArea } from "@radix-ui/react-scroll-area";
import {
  CheckCircle2,
  XCircle,
  Clock,
  FolderPlus,
  FilePlus,
} from "lucide-react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { apis } from "@/apis";
import { toast } from "@/lib/utils";
import { PLUGIN_SLUG } from "@/constants";

type FileStatus = "pending" | "uploading" | "success" | "failed";

interface DicomFile {
  id: string;
  name: string;
  file: File;
  status: FileStatus;
  study_uid?: string;
}

export default function DicomUploader({
  patientId,
  facilityId,
  serviceRequestId,
  onClose,
  onUploadSuccess,
}: {
  patientId: string;
  facilityId: string;
  serviceRequestId: string;
  onClose: () => void;
  onUploadSuccess?: () => void;
}) {
  const [files, setFiles] = useState<DicomFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { t } = useTranslation(PLUGIN_SLUG);
  const { t: baseTranslate } = useTranslation();

  const setFileStatus = (index: number, patch: Partial<DicomFile>) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    );
  };

  const handleFilesPicked = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;
    const picked = Array.from(selectedFiles);
    const accepted = picked.filter((file) => {
      const name = file.name.toLowerCase();
      return name.endsWith(".dcm") || name.endsWith(".dicom");
    });
    const dicomFiles = accepted.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      name: file.name,
      file,
      status: "pending" as FileStatus,
    }));
    if (accepted.length < picked.length) {
      toast.error(
        t("dicom_files_skipped_not_dcm", {
          count: picked.length - accepted.length,
        }),
      );
    }
    setFiles((prev) => [...prev, ...dicomFiles]);
    setUploadDone(false);
  };

  const handleSave = async () => {
    if (files.length === 0 || isUploading) return;
    setIsUploading(true);
    const counts = { success: 0, failed: 0 };
    let uploadedStudyUid: string | undefined;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.status !== "pending" && file.status !== "failed") continue;
      setFileStatus(i, { status: "uploading" });

      const formData = new FormData();
      formData.append("file", file.file);
      formData.append("filename", file.name);
      formData.append("patient_id", patientId);
      formData.append("facility_id", facilityId);

      try {
        const response = await apis.dicom.upload(formData);
        const isSuccess = response.message.includes("success");
        counts[isSuccess ? "success" : "failed"] += 1;
        if (isSuccess && response.study_uid) {
          uploadedStudyUid = response.study_uid;
        }
        setFileStatus(i, {
          status: isSuccess ? "success" : "failed",
          study_uid: response.study_uid,
        });
      } catch (_) {
        setFileStatus(i, { status: "failed" });
      }
    }

    if (counts.failed) {
      toast.error(
        t("dicom_upload_summary_failed", {
          failed: counts.failed,
          success: counts.success,
        }),
      );
    }

    if (uploadedStudyUid) {
      try {
        if (serviceRequestId) {
          await apis.dicom.linkServiceRequest({
            study_uid: uploadedStudyUid,
            service_request_id: serviceRequestId,
          });
        }
        onUploadSuccess?.();
        toast.success(t("dicom_files_uploaded_successfully"));
      } catch (_) {
        toast.error(t("dicom_failed_to_link_study"));
      }
    }

    if (counts.failed === 0) {
      setUploadDone(true);
    }

    setIsUploading(false);
  };

  const getStatusIcon = (status: FileStatus) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "uploading":
        return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />;
      default:
        return <div className="h-5 w-5 rounded-full border border-gray-300" />;
    }
  };

  const uploadedCount = files.filter((f) => f.status === "success").length;
  const failedCount = files.filter((f) => f.status === "failed").length;
  const pendingCount = files.filter((f) => f.status === "pending").length;
  const isUploadDone = uploadDone && !isUploading;

  return (
    <div>
      <Card className="h-full shadow-sm border border-gray-200 bg-white">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-xl font-semibold text-gray-800">
            {t("dicom_uploader")}
          </CardTitle>
          <div className="flex gap-2 items-center">
            <Button
              onClick={() => folderInputRef.current?.click()}
              disabled={isUploading}
              className="gap-2"
              variant="outline"
            >
              <div className="flex items-center gap-2">
                <FolderPlus className="h-4 w-4" />
                {t("dicom_upload_folder")}
              </div>
            </Button>
            <input
              ref={folderInputRef}
              type="file"
              multiple
              // @ts-expect-error - works for directories
              webkitdirectory=""
              onChange={handleFilesPicked}
              className="hidden"
              accept=".dcm,.dicom"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="gap-2"
              variant="outline"
            >
              <div className="flex items-center gap-2">
                <FilePlus className="h-4 w-4" />
                {t("dicom_upload_files_button")}
              </div>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFilesPicked}
              className="hidden"
              accept=".dcm,.dicom"
            />
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500">
              <FolderPlus className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {baseTranslate("no_files_attached")}
              </h3>
              <p className="text-sm max-w-sm text-gray-400">
                {t("dicom_upload_prompt")}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 p-3 rounded-md bg-gray-50 border border-gray-100 text-sm text-gray-700 font-bold">
                {uploadedCount > 0 && (
                  <span className="text-green-600">
                    {t("dicom_files_uploaded_count", { count: uploadedCount })}{" "}
                  </span>
                )}
                {failedCount > 0 && (
                  <span className="text-red-500">
                    {t("dicom_files_failed_count", { count: failedCount })}{" "}
                  </span>
                )}
                {pendingCount > 0 && !isUploading && (
                  <span className="text-gray-500">
                    {t("dicom_files_ready_count", { count: pendingCount })}
                  </span>
                )}
                {isUploading && (
                  <span className="text-blue-600">
                    {t("dicom_uploading_progress", {
                      current: uploadedCount + failedCount,
                      total: files.length,
                    })}
                  </span>
                )}
              </div>

              <ScrollArea className="max-h-[70vh] overflow-y-auto rounded-md border border-gray-100 bg-gray-50/40 p-3">
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-2 rounded-md bg-white border border-gray-100 hover:bg-gray-50 transition"
                    >
                      <span className="text-xs font-medium text-gray-400 w-10">
                        #{index + 1}
                      </span>
                      <span className="flex-1 text-sm text-gray-700 truncate">
                        {file.name}
                      </span>
                      <div className="flex gap-3">
                        {getStatusIcon(file.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
          <div className="flex justify-end gap-3 mt-6">
            <Button
              onClick={onClose}
              size="sm"
              variant={isUploadDone ? "primary" : "outline"}
              className="min-w-[100px]"
            >
              {isUploadDone ? baseTranslate("done") : baseTranslate("cancel")}
            </Button>
            {!isUploadDone && (
              <Button
                onClick={handleSave}
                disabled={
                  isUploading ||
                  files.every(
                    (f) => f.status !== "pending" && f.status !== "failed",
                  )
                }
                size="sm"
                className="min-w-[100px]"
              >
                {isUploading ? t("dicom_uploading") : baseTranslate("upload")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

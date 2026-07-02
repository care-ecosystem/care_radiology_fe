import { ScrollArea } from "@radix-ui/react-scroll-area";
import {
  CheckCircle2,
  XCircle,
  Clock,
  FolderPlus,
  FilePlus,
  Eye,
} from "lucide-react";
import { navigate } from "raviger";
import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { apis } from "@/apis";
import { Toaster } from "sonner";
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
  facilityId,
  patientId,
  serviceRequestId,
  embedded,
  onClose,
  onUploadSuccess,
}: {
  facilityId: string;
  patientId: string;
  serviceRequestId: string;
  embedded?: boolean;
  onClose?: () => void;
  onUploadSuccess?: () => void;
}) {
  const [files, setFiles] = useState<DicomFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [successfulLink, setSuccessfulLink] = useState<string | null>(null);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const goBack = () => (embedded && onClose ? onClose() : window.history.back());

  const { t } = useTranslation(PLUGIN_SLUG);
  const { t: baseTranslate } = useTranslation();

  const handleFolderSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;
    const dicomFiles = Array.from(selectedFiles).map((file, index) => ({
      id: `${Date.now()}-${index}`,
      name: file.name,
      file,
      status: "pending" as FileStatus,
    }));
    setFiles((prev) => [...prev, ...dicomFiles]);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;
    const dicomFiles = Array.from(selectedFiles).map((file, index) => ({
      id: `${Date.now()}-${index}`,
      name: file.name,
      file,
      status: "pending" as FileStatus,
    }));
    setFiles((prev) => [...prev, ...dicomFiles]);
  };

  const handleSave = async () => {
    if (files.length === 0 || isUploading) return;
    setIsUploading(true);
    const counts = { success: 0, failed: 0 };
    let uploadedStudyUid: string | undefined;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setFiles((prev) =>
        prev.map((f, index) =>
          index === i ? { ...f, status: "uploading" } : f
        )
      );

      const formData = new FormData();
      formData.append("file", file.file);
      formData.append("filename", file.name);
      formData.append("patient_id", patientId);

      try {
        const response = await apis.dicom.upload(formData);
        const isSuccess = response.message.includes("success");
        counts[isSuccess ? "success" : "failed"] += 1;
        if (isSuccess && response.study_uid) {
          uploadedStudyUid = response.study_uid;
        }
        setFiles((prev) =>
          prev.map((f, index) =>
            index === i
              ? {
                  ...f,
                  status: isSuccess ? "success" : "failed",
                  study_uid: response.study_uid,
                }
              : f
          )
        );
      } catch (_) {
        setFiles((prev) =>
          prev.map((f, index) => (index === i ? { ...f, status: "failed" } : f))
        );
      }
    }

    if (counts.failed) {
      toast.error(`${counts.failed} files failed. ${counts.success} uploaded.`);
    }

    if (uploadedStudyUid) {
      try {
        if (serviceRequestId) {
          await apis.dicom.linkServiceRequest({
            study_uid: uploadedStudyUid,
            service_request_id: serviceRequestId,
          });
        }

        const link = `/facility/${facilityId}/service_requests/${serviceRequestId}/radiology/view/${uploadedStudyUid}`;
        setSuccessfulLink(link);
        onUploadSuccess?.();
        toast.success("Files uploaded successfully");
      } catch (_) {
        toast.error("Failed to link study to the service request.");
      }
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
  const isEmbeddedUploadDone = embedded && !!successfulLink && !isUploading;

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
                Upload Folder
              </div>
              {/* Folder */}
            </Button>
            <input
              ref={folderInputRef}
              type="file"
              multiple
              // @ts-expect-error - works for directories
              webkitdirectory=""
              onChange={handleFolderSelect}
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
                Upload Files
              </div>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
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
                    {/* eslint-disable-next-line i18next/no-literal-string */}
                    {uploadedCount} uploaded.{" "}
                  </span>
                )}
                {failedCount > 0 && (
                  <span className="text-red-500">
                    {/* eslint-disable-next-line i18next/no-literal-string */}
                    {failedCount} failed.{" "}
                  </span>
                )}
                {pendingCount > 0 && !isUploading && (
                  <span className="text-gray-500">
                    {/* eslint-disable-next-line i18next/no-literal-string */}
                    {files.length} ready for upload.
                  </span>
                )}
                {isUploading && (
                  <span className="text-blue-600">
                    Uploading... {uploadedCount + failedCount} / {files.length}
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
              onClick={() => goBack()}
              size="sm"
              variant={isEmbeddedUploadDone ? "primary" : "outline"}
              className="min-w-[100px]"
            >
              {isEmbeddedUploadDone
                ? baseTranslate("done")
                : baseTranslate("cancel")}
            </Button>
            {!embedded && successfulLink && (
              <Button
                onClick={() => navigate(successfulLink)}
                disabled={isUploading || !successfulLink}
                size="sm"
                className="min-w-[100px]"
              >
                View Study
              </Button>
            )}
            {!isEmbeddedUploadDone && (
              <Button
                onClick={handleSave}
                disabled={
                  isUploading || files.every((f) => f.status !== "pending")
                }
                size="sm"
                className="min-w-[100px]"
              >
                {isUploading ? "Uploading..." : baseTranslate("upload")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      {!embedded && <Toaster />}
    </div>
  );
}

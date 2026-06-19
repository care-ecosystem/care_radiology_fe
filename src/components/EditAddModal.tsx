/* eslint-disable i18next/no-literal-string */
import { useEffect, useState } from "react";
import { apis } from "@/apis";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "./ui/dialog";

export default function EditAddModal({
  open,
  editData,
  prefillData,
  onClose,
  onSuccess,
}: {
  open: boolean;
  editData?: any;
  prefillData?: any;
  onClose: () => void;
  onSuccess: (savedItem: any) => void;
}) {
  const isEdit = Boolean(editData?.external_id);
  const [name, setName] = useState("");
  const [selectedModality, setSelectedModality] = useState("");
  const [selectedBodyPart, setSelectedBodyPart] = useState("");
  const { t } = useTranslation("care_radiology_fe");

  useEffect(() => {
    if (!open) return;

    setName(editData?.display_name || "");
    // Modality and body_part always come from prefillData (set from service request)
    setSelectedModality(prefillData?.modality || "");
    setSelectedBodyPart(prefillData?.body_part || "");
  }, [open, editData, prefillData]);

  const handleSave = async () => {
    if (!name || name.trim().length < 2) {
      toast.warning(t("radiology_name_min_length"));
      return;
    }
    try {
      const savedItem = isEdit
        ? await apis.scanProtocol.update(editData.external_id, {
            display_name: name,
            modality: selectedModality,
            body_part: selectedBodyPart,
          })
        : await apis.scanProtocol.create({
            display_name: name,
            modality: selectedModality,
            body_part: selectedBodyPart,
            coding: [],
          });
      toast.success(
        isEdit
          ? t("radiology_updated_successfully")
          : t("radiology_saved_successfully"),
      );
      onSuccess(savedItem);
      onClose();
    } catch (err) {
      console.error("Save failed:", err);
      toast.warning("Save failed!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit" : "Add"} Scan Protocol
          </DialogTitle>
        </DialogHeader>

        {/* Name Field */}
        <div className="mt-3">
          <label className="text-sm font-medium">{t("radiology_name")}</label>
          <Input
            className="mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("radiology_enter_name")}
          />
        </div>

        {/* Modality — readonly, derived from service request */}
        <div className="mt-3">
          <label className="text-sm font-medium">
            {t("radiology_modality_type")}
          </label>
          <select
            className="border w-full p-2 rounded-md mt-1 bg-gray-100 cursor-not-allowed"
            value={selectedModality}
            disabled
          >
            {selectedModality && (
              <option value={selectedModality}>{selectedModality}</option>
            )}
          </select>
        </div>

        {/* Body Part — readonly, derived from service request */}
        <div className="mt-3">
          <label className="text-sm font-medium">
            {t("radiology_body_part")}
          </label>
          <select
            className="border w-full p-2 rounded-md mt-1 bg-gray-100 cursor-not-allowed"
            value={selectedBodyPart}
            disabled
          >
            {selectedBodyPart && (
              <option value={selectedBodyPart}>{selectedBodyPart}</option>
            )}
          </select>
        </div>
        <DialogFooter className="mt-5">
          <Button variant="outline" onClick={onClose}>
            {t("radiology_cancel")}
          </Button>
          <Button onClick={handleSave}>
            {isEdit ? t("radiology_update") : t("radiology_save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

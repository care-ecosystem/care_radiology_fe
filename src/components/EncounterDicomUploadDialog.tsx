import { FC } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import DicomUploader from "./DicomUploader";

type Props = {
  open: boolean;
  onClose: () => void;
  patientId: string;
  encounterId: string;
  onUploadSuccess?: () => void;
};

export const EncounterDicomUploadDialog: FC<Props> = ({
  open,
  onClose,
  patientId,
  encounterId,
  onUploadSuccess,
}) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="max-w-[calc(100%-2rem)] sm:max-w-4xl max-h-[90vh] overflow-auto gap-0 p-0"
        hideCloseButton
      >
        <DicomUploader
          patientId={patientId}
          encounterId={encounterId}
          onClose={onClose}
          onUploadSuccess={onUploadSuccess}
        />
      </DialogContent>
    </Dialog>
  );
};

export default EncounterDicomUploadDialog;

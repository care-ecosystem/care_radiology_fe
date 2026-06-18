import { useState, useEffect, useRef } from "react";
import { apis } from "@/apis";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import Quill from "quill";
import Editor from "./ui/quilleditor";
import { Plus, Pencil, Info } from "lucide-react"; // icons
import EditAddModal from "./EditAddModal";
import { toast, Toaster } from "sonner";
import { useTranslation } from "react-i18next";
import RadiologyAuditPopup from "./Common/RadiologyAuditPopup";
import PatientDetails from "./Common/PatientDetails";
import { APIError } from "@/apis/request";
import { formatPatientAge } from "@/utils/formatPatientAge";
import { RadiologyServiceRequest } from "@/types/ServiceRequest";

export default function DicomReport({
  facilityId,
  patientId,
  serviceRequestId,
  studyUid,
}: {
  facilityId: string;
  patientId: string;
  serviceRequestId: string;
  studyUid: string;
}) {
  const [modalities, setModalities] = useState<any[]>([]);
  const [bodyParts, setBodyParts] = useState<any[]>([]);
  const [scanProtocols, setScanProtocols] = useState<any[]>([]);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const [modalType, setModalType] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const [selectedModality, setSelectedModality] = useState("");
  const [selectedBodyPart, setSelectedBodyPart] = useState("");
  const [selectedScanProtocol, setSelectedScanProtocol] = useState("");

  const [loadingModalities, setLoadingModalities] = useState(false);
  const [loadingBodyParts, setLoadingBodyParts] = useState(false);
  const [loadingScanProtocols, setLoadingScanProtocols] = useState(false);

  const [showTemplatePrompt, setShowTemplatePrompt] = useState(false);
  const [templateData, setTemplateData] = useState<any>(null);

  const [reportExists, setReportExists] = useState(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  const [studyReportId, setStudyReportId] = useState<string | null>(null);
  const [showAuditPopup, setShowAuditPopup] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [patient, setPatient] = useState<any>(null);
  const [requester, setRequester] = useState<any>(null);
  const [departments, setDepartments] = useState<any>([]);
  const [dicomStudy, setDicomStudy] = useState<any>(null);

  const { t: basetranslate } = useTranslation();
  const { t } = useTranslation("care_radiology_fe");
  const techniqueRef = useRef<Quill | null>(null);
  const findingsRef = useRef<Quill | null>(null);
  const impressionRef = useRef<Quill | null>(null);

  useEffect(() => {
    if (!serviceRequestId) return;

    const fetchRadiologyServiceRequest = async () => {
      try {
        const radiologyServiceRequests: RadiologyServiceRequest[] =
          await apis.servicerequest.fetch({
            serviceRequestId,
          });

        const relevantServiceRequest = radiologyServiceRequests.find(
          (serviceRequest) => {
            if (serviceRequest.dicom_study.external_id === studyUid) {
              return true;
            }
          },
        );

        if (relevantServiceRequest === undefined) {
          throw new Error("No service request exist for given studyUid");
        }

        const patientData = relevantServiceRequest.service_request.encounter.patient;
        const requesterData = relevantServiceRequest.service_request.requester;
        const departmentData = relevantServiceRequest.service_request.encounter.organizations;
        const dicomStudyData = relevantServiceRequest.dicom_study;

        setPatient(patientData);
        setRequester(requesterData);
        setDepartments(departmentData ?? []);
        setDicomStudy(dicomStudyData);
      } catch (err) {
        console.error("Service Request fetch failed", err);
      }
    };

    fetchRadiologyServiceRequest();
  }, [serviceRequestId]);

  useEffect(() => {
    if (modalities.length === 0 || initialLoaded) return;

    const init = async () => {
      try {
        // STUDY REPORT FIRST
        const reportId = new URLSearchParams(window.location.search).get("reportId");

        if (!reportId) {
          setInitialLoaded(true);
          return;
        }

        const reportRes = await apis.studyReport.fetchByStudy(studyUid);
        const allReports: any[] = reportRes?.results ?? [];
        const targetReport = allReports.find((r) => r.external_id === reportId);

        if (targetReport) {
          const r = targetReport;
          setStudyReportId(r.external_id);
          setSelectedModality(r.modality_id);
          setSelectedBodyPart(r.body_part_id);
          setSelectedScanProtocol(r.scan_protocol_id);
          techniqueRef.current?.clipboard.dangerouslyPasteHTML(
            r.technique || "",
          );
          findingsRef.current?.clipboard.dangerouslyPasteHTML(r.findings || "");
          impressionRef.current?.clipboard.dangerouslyPasteHTML(
            r.impression || "",
          );
          setReportExists(true);
          setInitialLoaded(true);
          return;
        }

        //  DICOM STUDY SECOND
        const ds = await apis.dicom.fetchOne(studyUid);
        if (ds?.study_modality_id) {
          const matched = modalities.find(
            (m) => m.external_id === ds.study_modality_id,
          );
          if (matched) {
            setSelectedModality(matched.external_id);
          }
          setInitialLoaded(true);
          return;
        }

        // EMPTY STATE THIRD
        setSelectedModality("");
        setSelectedBodyPart("");
        setSelectedScanProtocol("");
        setInitialLoaded(true);
      } catch (err) {
        if ((err as APIError).status == 403) {
          return toast.error((err as APIError).message);
        }
        console.error("Init failed", err);
      }
    };
    init();
  }, [modalities]);

  useEffect(() => {
    if (!selectedModality || !selectedBodyPart || !selectedScanProtocol) {
      return;
    }
    // Skip ONLY first time when report exists
    if (!initialCheckDone && reportExists) {
      setInitialCheckDone(true);
      return;
    }
    const checkTemplate = async () => {
      try {
        const res = (await apis.template.fetchAll()) as { results: any[] };
        const match = res.results.find(
          (t) =>
            t.modality_id === selectedModality &&
            t.body_part_id === selectedBodyPart &&
            t.scan_protocol_id === selectedScanProtocol,
        );
        if (match) {
          setTemplateData(match);
          setShowTemplatePrompt(true);
        }
      } finally {
        setInitialCheckDone(true);
      }
    };
    checkTemplate();
  }, [selectedModality, selectedBodyPart, selectedScanProtocol]);

  useEffect(() => {
    if (showAuditPopup && studyReportId) {
      apis.studyReportAudit.fetchByStudyReport(studyReportId).then((res) => {
        setAuditLogs(res.results || []);
      });
    }
  }, [showAuditPopup, studyReportId]);

  // Fetch all modalities
  useEffect(() => {
    const fetchModalities = async () => {
      try {
        setLoadingModalities(true);
        const data = await apis.modality.fetchAll();
        setModalities(data.results);
      } catch (err) {
        console.error("Failed to load modality types", err);
      } finally {
        setLoadingModalities(false);
      }
    };
    fetchModalities();
  }, []);

  // Fetch BodyParts based on selected modality
  useEffect(() => {
    if (!selectedModality) return;
    const fetchBodyParts = async () => {
      try {
        setLoadingBodyParts(true);
        const data = await apis.bodyPart.fetchAll();
        //FILTER BY ID
        const filtered = data.results.filter(
          (bp: any) => bp.modality_id === selectedModality,
        );
        setBodyParts(filtered);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingBodyParts(false);
      }
    };
    fetchBodyParts();
  }, [selectedModality]);

  // Fetch ScanProtocols based on selected modality & body_part
  useEffect(() => {
    if (!selectedModality || !selectedBodyPart) return;
    const fetchScanProtocols = async () => {
      try {
        setLoadingScanProtocols(true);
        const data = await apis.scanProtocol.fetchAll();
        // FILTER BY IDs
        const filtered = data.results.filter(
          (sp) =>
            sp.modality_id === selectedModality &&
            sp.body_part_id === selectedBodyPart,
        );
        setScanProtocols(filtered);
        // auto-select ONLY for fresh flow
        /* if (!selectedScanProtocol && filtered.length > 0) {
          setSelectedScanProtocol(filtered[0].external_id);
        } */
      } catch (err) {
        console.error("Failed to load scan protocols", err);
      } finally {
        setLoadingScanProtocols(false);
      }
    };
    fetchScanProtocols();
  }, [selectedModality, selectedBodyPart]);

  const getEditorText = (ref: React.RefObject<Quill | null>) => {
    const html = ref.current?.root.innerHTML || "";
    const text = html.replace(/<(.|\n)*?>/g, "").trim(); // strip HTML
    return { html, text };
  };
  const canPreview = reportExists;
  const validateReportFields = () => {
    if (!selectedModality) {
      toast.warning(t("radiology_please_select_modality"));
      return false;
    }
    if (!selectedBodyPart) {
      toast.warning(t("radiology_please_select_body_part"));
      return false;
    }
    if (!selectedScanProtocol) {
      toast.warning(t("radiology_please_select_scan_protocol"));
      return false;
    }
    const technique = getEditorText(techniqueRef);
    if (!technique.text) {
      toast.warning(t("radiology_please_fill_technique"));
      return false;
    }
    const findings = getEditorText(findingsRef);
    if (!findings.text) {
      toast.warning(t("radiology_please_fill_findings"));
      return false;
    }
    const impression = getEditorText(impressionRef);
    if (!impression.text) {
      toast.warning(t("radiology_please_fill_impression"));
      return false;
    }
    return true;
  };

  const handleCancel = () => window.history.back();

  const handleSave = async () => {
    if (reportExists) {
      setShowOverwriteConfirm(true);
      return;
    }
    await saveReport();
  };
  const saveReport = async () => {
    if (!validateReportFields()) return;
    const techniqueContent = techniqueRef.current?.root.innerHTML;
    const findingsContent = findingsRef.current?.root.innerHTML;
    const impressionContent = impressionRef.current?.root.innerHTML;
    try {
      const res = (await apis.studyReport.create({
        study: studyUid,
        modality: selectedModality,
        body_part: selectedBodyPart,
        scan_protocol: selectedScanProtocol,
        technique: techniqueContent,
        findings: findingsContent,
        impression: impressionContent,
      })) as { external_id: string };
      if (res?.external_id) {
        setStudyReportId(res.external_id);
      }
      toast.success(t("radiology_report_saved_successfully!"));
      setReportExists(true);
    } catch (err) {
      if ((err as APIError).status == 403) {
        return toast.error((err as APIError).message);
      } else {
        toast.error(t("radiology_error_saving_report"));
      }
    }
  };

  const handlePreview = () => {
    const query = studyReportId ? `?reportId=${studyReportId}` : "";
    window.open(
      `/facility/${facilityId}/service_requests/${serviceRequestId}/radiology/report/${studyUid}/preview${query}`,
      "_blank",
    );
  };

  const handleSaveAsTemplate = async () => {
    if (!validateReportFields()) return;
    const techniqueContent = techniqueRef.current?.root.innerHTML;
    const findingsContent = findingsRef.current?.root.innerHTML;
    const impressionContent = impressionRef.current?.root.innerHTML;
    try {
      await apis.template.create({
        modality: selectedModality,
        body_part: selectedBodyPart,
        scan_protocol: selectedScanProtocol,
        technique: techniqueContent,
        findings: findingsContent,
        impression: impressionContent,
      });
      toast.success(t("radiology_template_saved_successfully!"));
    } catch (err) {
      console.error("Error saving template:", err);
      toast.error(t("radiology_failed_to_save_template"));
    }
  };

  // Placeholder handlers for buttons (can be expanded later)
  const handleAdd = (type: string) => {
    setModalType(type);
    setEditItem(null);
    setModalOpen(true);
  };

  const handleEdit = (type: string) => {
    let item = null;
    if (type === "modality") {
      item = modalities.find((m) => m.external_id === selectedModality);
    } else if (type === "bodypart") {
      item = bodyParts.find((bp) => bp.external_id === selectedBodyPart);
    } else if (type === "scanprotocol") {
      item = scanProtocols.find(
        (sp) => sp.external_id === selectedScanProtocol,
      );
    }
    if (!item)
      return toast.warning(t("radiology_please_select_an_item_to_edit"));
    setModalType(type);
    setEditItem(item);
    setModalOpen(true);
  };

  const patientAgeGender = patient
    ? `${formatPatientAge(patient, true)}, ${basetranslate(`GENDER__${patient.gender}`)}`
    : "-";

  return (
    <div className="w-full h-full flex flex-col">
      {/* Page Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {t("radiology_dicom_report")}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Reporting on study{" "}
            <span className="font-medium">ACC-2026-005821</span> · Patient{" "}
            <span className="font-medium">
              {patient?.name ?? "-"} {patientAgeGender}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 text-sm text-gray-500"></span>
          <Info
            size={18}
            className="cursor-pointer text-gray-400 hover:text-green-600 ml-2"
            onClick={() => setShowAuditPopup(true)}
          />
        </div>
      </div>

      {/* Patient Details Card */}
      <div>
        <PatientDetails
          patient={patient}
          requester={requester}
          dicomStudy={dicomStudy}
          departments={departments}
        />
      </div>

      {/* Main Report Card */}
      <Card className="w-full border shadow-sm bg-white mx-6 mb-6">
        <div className="flex flex-row gap-0 w-full h-[80vh] overflow-hidden">
          {/* Left Sidebar */}
          <div className="w-[360px] min-w-[360px] max-w-[360px] border-r p-6 bg-white flex flex-col gap-4 overflow-y-auto shrink-0 overflow-x-hidden">
            {/* Modality Section */}
            <div className="w-full min-w-0">
              <div className="flex justify-between items-center mb-2 gap-2">
                <h4 className="font-medium text-sm text-gray-700 truncate flex-1">
                  {t("radiology_modality_type")}{" "}
                  <span className="text-red-500">*</span>
                </h4>
                <div className="flex gap-1 shrink-0">
                  <Plus
                    size={16}
                    className="cursor-pointer hover:text-green-600"
                    onClick={() => handleAdd("modality")}
                  />
                  <Pencil
                    size={16}
                    className="cursor-pointer hover:text-green-600"
                    onClick={() => handleEdit("modality")}
                  />
                </div>
              </div>
              {loadingModalities ? (
                <div className="text-sm text-gray-500">
                  {t("radiology_loading")}
                </div>
              ) : (
                <select
                  value={selectedModality}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedModality(value);
                    //RESET DEPENDENTS
                    setSelectedBodyPart("");
                    setSelectedScanProtocol("");
                    setBodyParts([]);
                    setScanProtocols([]);
                    setInitialLoaded(false);
                  }}
                  className="w-full max-w-full border border-gray-300 rounded-md text-sm p-2.5 bg-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
                >
                  <option value="">{t("radiology_select_modality")}</option>
                  {modalities.map((mod) => (
                    <option key={mod.external_id} value={mod.external_id}>
                      {mod.display_name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Body Part Section */}
            <div className="w-full min-w-0">
              <div className="flex justify-between items-center mb-2 gap-2">
                <h4 className="font-medium text-sm text-gray-700 truncate flex-1">
                  {t("radiology_body_part")}{" "}
                  <span className="text-red-500">*</span>
                </h4>
                <div className="flex gap-1 shrink-0">
                  <Plus
                    size={16}
                    className="cursor-pointer hover:text-green-600"
                    onClick={() => handleAdd("bodypart")}
                  />
                  <Pencil
                    size={16}
                    className="cursor-pointer hover:text-green-600"
                    onClick={() => handleEdit("bodypart")}
                  />
                </div>
              </div>
              {loadingBodyParts ? (
                <div className="text-sm text-gray-500">
                  {t("radiology_loading")}
                </div>
              ) : (
                <select
                  value={selectedBodyPart}
                  onChange={(e) => {
                    setSelectedBodyPart(e.target.value);
                    setSelectedScanProtocol("");
                    setScanProtocols([]);
                    setInitialLoaded(false);
                  }}
                  className="w-full max-w-full border border-gray-300 rounded-md text-sm p-2.5 bg-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
                >
                  <option value="">{t("radiology_select")} Body Part</option>
                  {bodyParts.map((bp) => (
                    <option key={bp.external_id} value={bp.external_id}>
                      {bp.display_name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Scan Protocol Section */}
            <div className="w-full min-w-0">
              <div className="flex justify-between items-center mb-2 gap-2">
                <h4 className="font-medium text-sm text-gray-700 truncate flex-1">
                  {t("radiology_scan_protocol")}
                </h4>
                <div className="flex gap-1 shrink-0">
                  <Plus
                    size={16}
                    className="cursor-pointer hover:text-green-600"
                    onClick={() => handleAdd("scanprotocol")}
                  />
                  <Pencil
                    size={16}
                    className="cursor-pointer hover:text-green-600"
                    onClick={() => handleEdit("scanprotocol")}
                  />
                </div>
              </div>
              {loadingScanProtocols ? (
                <div className="text-sm text-gray-500">
                  {t("radiology_loading")}
                </div>
              ) : (
                <select
                  value={selectedScanProtocol}
                  onChange={(e) => setSelectedScanProtocol(e.target.value)}
                  className="w-full max-w-full border border-gray-300 rounded-md text-sm p-2.5 bg-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
                >
                  <option value="">
                    {t("radiology_select")} Scan Protocol
                  </option>
                  {scanProtocols.map((sp) => (
                    <option key={sp.external_id} value={sp.external_id}>
                      {sp.display_name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Report Section */}
          <div className="flex-1 p-6 bg-white overflow-y-auto">
            <div className="flex flex-col gap-4 h-full">
              {/* Scan Protocol Summary */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-medium text-gray-700 text-sm">
                    {t("radiology_scan_protocol")} Summary
                  </label>
                  <span className="text-xs text-gray-500">
                    Auto-derived from left panel
                  </span>
                </div>
                <Input
                  value={
                    scanProtocols.find(
                      (sp) => sp.external_id === selectedScanProtocol,
                    )?.display_name || ""
                  }
                  readOnly
                  className="bg-gray-100 border-gray-200"
                />
              </div>

              {/* Technique */}
              <div>
                <label className="font-medium text-gray-700 text-sm">
                  {t("radiology_technique")}
                </label>
                <div className="border rounded-md bg-white mt-1">
                  <Editor ref={techniqueRef} height={130} />
                </div>
              </div>

              {/* Findings */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-medium text-gray-700 text-sm">
                    {t("radiology_findings")}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                </div>
                <div className="border rounded-md bg-white">
                  <Editor ref={findingsRef} height={180} />
                </div>
              </div>

              {/* Impression */}
              <div>
                <label className="font-medium text-gray-700 text-sm">
                  {t("radiology_impression")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <div className="border rounded-md bg-white mt-1">
                  <Editor ref={impressionRef} height={130} />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-between items-center gap-4 mt-auto">
                <div className="flex justify-start gap-4">
                  <Button variant="outline" onClick={handleSaveAsTemplate}>
                    {t("radiology_save_as_template")}
                  </Button>
                  {canPreview && (
                    <Button variant="outline" onClick={handlePreview}>
                      {t("radiology_preview")}
                    </Button>
                  )}
                </div>
                <div className="flex justify-end gap-4">
                  <Button variant="secondary" onClick={handleCancel}>
                    {t("radiology_cancel")}
                  </Button>
                  <Button variant="primary" onClick={handleSave}>
                    {t("radiology_save")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {showTemplatePrompt && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-[400px] relative p-5">
            <h3 className="text-lg font-semibold mb-2">
              {t("radiology_template_found")}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {t("radiology_template_exists_for_user")}
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  techniqueRef.current?.setText("");
                  findingsRef.current?.setText("");
                  impressionRef.current?.setText("");
                  setShowTemplatePrompt(false);
                  setInitialLoaded(true);
                }}
              >
                {t("radiology_start_fresh")}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  // Keep whatever user already typed
                  setShowTemplatePrompt(false);
                  setInitialLoaded(true);
                }}
              >
                {t("radiology_use_existing")}
              </Button>

              <Button
                onClick={async () => {
                  if (!templateData) return;
                  //  IMPORTANT: Use id fields
                  setSelectedModality(templateData.modality_id);
                  // wait for body parts to load
                  await new Promise((r) => setTimeout(r, 300));
                  setSelectedBodyPart(templateData.body_part_id);
                  // wait for scan protocols
                  await new Promise((r) => setTimeout(r, 300));
                  setSelectedScanProtocol(templateData.scan_protocol_id);
                  techniqueRef.current?.clipboard.dangerouslyPasteHTML(
                    templateData.technique || "",
                  );
                  findingsRef.current?.clipboard.dangerouslyPasteHTML(
                    templateData.findings || "",
                  );
                  impressionRef.current?.clipboard.dangerouslyPasteHTML(
                    templateData.impression || "",
                  );
                  setShowTemplatePrompt(false);
                  setInitialLoaded(true);
                }}
              >
                {t("radiology_use_template")}
              </Button>
            </div>
          </div>
        </div>
      )}
      {showOverwriteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-[400px] relative p-5">
            <h3 className="text-lg font-semibold mb-2 text-red-600">
              {t("radiology_overwrite_report")}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {t("radiology_report_exists_for_study")}
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowOverwriteConfirm(false)}
              >
                {t("radiology_cancel")}
              </Button>

              <Button
                variant="destructive"
                onClick={async () => {
                  setShowOverwriteConfirm(false);
                  await saveReport();
                }}
              >
                {t("radiology_overwrite")}
              </Button>
            </div>
          </div>
        </div>
      )}
      <EditAddModal
        open={modalOpen}
        type={modalType}
        editData={editItem}
        prefillData={{
          modality_id: selectedModality,
          body_part_id: selectedBodyPart,
        }}
        onClose={() => setModalOpen(false)}
        onSuccess={async (savedItem: any) => {
          // reload data after add/edit
          if (modalType === "modality") {
            const r = await apis.modality.fetchAll();
            setModalities(r.results);
            if (savedItem?.external_id) {
              setSelectedModality(savedItem.external_id);
              if (!editItem) {
                setSelectedBodyPart("");
                setSelectedScanProtocol("");
                setScanProtocols([]);
              }
              setInitialLoaded(true);
            }
          }
          if (modalType === "bodypart") {
            const r = await apis.bodyPart.fetchAll();
            setBodyParts(
              r.results.filter((bp) => bp.modality_id === selectedModality),
            );
            if (savedItem?.external_id) {
              setSelectedBodyPart(savedItem.external_id);
              if (!editItem) {
                setSelectedScanProtocol("");
              }
            }
          }
          if (modalType === "scanprotocol") {
            const r = await apis.scanProtocol.fetchAll();
            setScanProtocols(
              r.results.filter(
                (sp) =>
                  sp.modality_id === selectedModality &&
                  sp.body_part_id === selectedBodyPart,
              ),
            );
            if (savedItem?.external_id) {
              setSelectedScanProtocol(savedItem.external_id);
            }
          }
        }}
      />
      <RadiologyAuditPopup
        open={showAuditPopup}
        onClose={() => setShowAuditPopup(false)}
        audits={auditLogs}
      />
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}

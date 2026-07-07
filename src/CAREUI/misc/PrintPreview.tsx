import { ReactNode, useEffect } from "react";
import { useTranslation } from "react-i18next";

import CareIcon from "@/CAREUI/icons/CareIcon";
import { Button } from "@/components/ui/button";
import ShortcutBadge from "@/components/ui/ShortcutBadge";

type Props = {
  children: ReactNode;
  title?: string;
  className?: string;
};

export default function PrintPreview({ children, title, className }: Props) {
  const { t } = useTranslation("care_radiology_fe");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {      
      if (e.key.toLowerCase() === "p") {
        e.preventDefault();
        window.print();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="radiology-container flex items-center justify-center">
      <div className="mx-4 my-4 max-w-[95vw] print:max-w-none sm:my-8">
        {/* Header (hidden in print) */}
        {title && (
          <div className="flex items-center justify-between mb-6 print:hidden">
            <h2 className="text-xl font-semibold">{title}</h2>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => window.close()}>
                <CareIcon icon="l-x" className="text-lg" />
                {t("radiology_close")}
              </Button>

              <Button variant="primary" onClick={() => window.print()}>
                <CareIcon icon="l-print" className="text-lg" />
                {t("radiology_print")}
                <ShortcutBadge label="P" className="bg-white" />
              </Button>
            </div>
          </div>
        )}

        {/* Printable Area */}
        <div className="origin-top-left bg-white p-10 text-sm shadow-2xl transition-all duration-200 ease-in-out print:shadow-none print:p-0 max-w-[calc(100vw-1rem)]">
          <div
            id="section-to-print"
            className={`w-full print:py-10 ${className || ""}`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

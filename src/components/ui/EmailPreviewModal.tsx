import { X } from "lucide-react";

interface EmailPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  html: string;
  height?: string;
}

export function EmailPreviewModal({
  isOpen,
  onClose,
  html,
  height = "85vh",
}: EmailPreviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
      <div
        className="relative w-full max-w-3xl rounded-xl bg-surface shadow-2xl"
        style={{ height }}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-lg font-semibold text-text">Preview do Email</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-text-muted hover:bg-surface-light hover:text-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="h-[calc(100%-64px)] overflow-hidden rounded-b-xl bg-white">
          <iframe
            title="Email Preview"
            srcDoc={html}
            className="h-full w-full border-0"
            sandbox="allow-same-origin allow-scripts"
          />
        </div>
      </div>
    </div>
  );
}

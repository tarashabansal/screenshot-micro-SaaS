"use client";

import { useEffect, useState, useRef } from "react";

export default function Home() {
  const [status, setStatus] = useState<
    "idle" | "dragover" | "uploading" | "done" | "error"
  >("idle");

  const [shareUrl, setShareUrl] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const tooltipTimerRef = useRef<number | null>(null);

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) uploadScreenshot(file);
          break;
        }
      }
    }

    function handleDrop(e: DragEvent) {
      e.preventDefault();
      const files = e.dataTransfer?.files;
      if (!files?.length) return;

      const file = files[0];
      if (file.type.startsWith("image/")) uploadScreenshot(file);
    }

    function handleDragOver(e: DragEvent) {
      e.preventDefault();
      if (status !== "uploading") setStatus("dragover");
    }

    function handleDragLeave() {
      if (status !== "uploading") setStatus("idle");
    }

    window.addEventListener("paste", handlePaste as any);
    window.addEventListener("drop", handleDrop as any);
    window.addEventListener("dragover", handleDragOver as any);
    window.addEventListener("dragleave", handleDragLeave as any);

    return () => {
      window.removeEventListener("paste", handlePaste as any);
      window.removeEventListener("drop", handleDrop as any);
      window.removeEventListener("dragover", handleDragOver as any);
      window.removeEventListener("dragleave", handleDragLeave as any);
    };
  }, [status]);
  async function uploadScreenshot(file: File) {
    setStatus("uploading");

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });

      const data = await res.json();

      const share = data?.shareUrl ?? data?.url ?? null;
      const preview = data?.previewUrl ?? data?.signedUrl ?? null;

      if (share) {
        setShareUrl(share);
        setPreviewUrl(preview);
        setStatus("done");
        return;
      }

      if (data?.error) {
        console.error("Upload API error:", data.error);
        setStatus("error");
        return;
      }

      console.error("Unexpected upload response:", data);
      setStatus("error");
    } catch (err) {
      console.error("Upload failed", err);
      setStatus("error");
    }
  }

  async function copyLink() {
    if (!shareUrl) return;

    await navigator.clipboard.writeText(shareUrl);

    setTooltipVisible(true);
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);

    tooltipTimerRef.current = window.setTimeout(() => {
      setTooltipVisible(false);
    }, 2000);
  }

  function resetUpload() {
    setShareUrl("");
    setPreviewUrl("");
    setStatus("idle");
    setTooltipVisible(false);
  }

  //FrontEnd UI
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-semibold mb-6 text-center">
          Quick Screenshot Share
        </h1>

        {/* UPLOAD AREA (HIDDEN AFTER UPLOAD) */}
        {status !== "done" && (
          <div
            aria-label="Paste or Drop Area"
            className={`
              flex flex-col items-center justify-center gap-4 p-10 rounded-lg border-2 transition-colors
              ${
                status === "dragover"
                  ? "border-blue-400 bg-white border-dashed"
                  : "border-gray-300 bg-white border-dashed"
              }
            `}
          >
            <p className="text-gray-600 text-sm">
              Paste a screenshot (Ctrl/Cmd + V) or drag & drop an image here
            </p>

            <div
              className={`w-48 h-28 flex items-center justify-center border-2 rounded-md text-gray-400 text-xs
                  ${
                    status === "dragover"
                      ? "border-blue-300 border-dashed"
                      : "border-gray-200 border-dashed"
                  }
                `}
            >
              Drop / Paste Area
            </div>

            <p className="text-xs text-gray-400">PNG, JPG — Max 10MB</p>
          </div>
        )}

        {/* STATUS / RESULTS */}
        <div className="mt-6">
          {status === "idle" && (
            <p className="text-center text-gray-600 text-sm">
              Waiting for screenshot…
            </p>
          )}

          {status === "uploading" && (
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-blue-600 text-sm">Uploading…</span>
            </div>
          )}

          {status === "error" && (
            <p className="text-red-600 text-sm">Upload failed. Try again.</p>
          )}

          {/* DONE — SHARE URL + PREVIEW */}
          {status === "done" && shareUrl && (
            <div className="flex flex-col gap-4 mt-4">
              {/* SHARE LINK BOX */}
              <div className="w-full bg-white border rounded-md p-3 flex justify-between gap-4">
                <div className="text-sm text-slate-800 max-w-[70vw] break-all whitespace-normal">
                  {shareUrl}
                </div>
</div>

                <div className="relative flex items-center gap-2">
                  {/* Tooltip */}
                  <div
                    className={`absolute -top-10 right-0 transition-all ${
                      tooltipVisible
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 -translate-y-1 pointer-events-none"
                    }`}
                  >
                    <div className="bg-black text-white text-xs px-2 py-1 rounded shadow">
                      Copied!
                    </div>
                  </div>

                  <button
                    onClick={copyLink}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Copy
                  </button>

                  <button
                    onClick={() => window.open(shareUrl, "_blank")}
                    className="px-3 py-1 bg-gray-100 text-sm rounded hover:bg-gray-200"
                  >
                    Open
                  </button>

                  <button
                    onClick={resetUpload}
                    className="px-3 py-1 bg-gray-50 border text-sm rounded hover:bg-gray-100"
                  >
                    New Upload
                  </button>
                </div>

              {/* PREVIEW */}
              {previewUrl && (
                <div className=" rounded p-3">
                  <p className="text-xs text-gray-500 mb-2">Preview</p>
                  <div className="flex justify-center">
                    <img
                      src={previewUrl}
                      alt="Screenshot preview"
                      className="max-h-72 max-w-full border rounded"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

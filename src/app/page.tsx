"use client";

import { useEffect, useState, useRef } from "react";
export default function Home() {
  const [status, setStatus] = useState<
    "idle" | "dragover" | "uploading" | "done" | "error"
  >("idle");
  const [link, setLink] = useState<string>("");
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const tooltipTimerRef = useRef<number | null>(null);

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            uploadScreenshot(file);
          }
          break;
        }
      }
    }

    function handleDrop(e: DragEvent) {
      e.preventDefault();
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      const file = files[0];
      if (file.type.startsWith("image/")) uploadScreenshot(file);
    }

    function handleDragOver(e: DragEvent) {
      e.preventDefault();
      setStatus((s) => (s === "uploading" ? s : "dragover"));
    }

    function handleDragLeave() {
      setStatus((s) => (s === "uploading" ? s : "idle"));
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
      if (tooltipTimerRef.current) {
        clearTimeout(tooltipTimerRef.current);
      }
    };
  }, []);

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

      if (data?.url) {
        setLink(data.url);
        setStatus("done");
      } else {
        console.error("Upload error:", data);
        setStatus("error");
      }
    } catch (err) {
      console.error("Upload failed", err);
      setStatus("error");
    }
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);

      // show tooltip
      setTooltipVisible(true);
      if (tooltipTimerRef.current) window.clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = window.setTimeout(() => {
        setTooltipVisible(false);
      }, 2500);
    } catch (e) {
      console.error("Copy failed", e);
    }
  }

  function resetUpload() {
    setLink("");
    setStatus("idle");
    setTooltipVisible(false);
    if (tooltipTimerRef.current) {
      window.clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-semibold mb-6 text-center">
          Quick Screenshot Share
        </h1>

        {/* Show upload area only when not done */}
        {status !== "done" && (
          <div
            aria-label="Paste or drop area"
            role="region"
            className={`
              flex items-center justify-center flex-col gap-3 p-8 rounded-lg
              transition-colors border-2
              ${status === "dragover" ? "border-dashed border-blue-400 bg-white" : "border-dashed border-gray-300 bg-white"}
              hover:border-blue-400
              focus-within:ring-2 focus-within:ring-blue-300
            `}
          >
            <div className="w-full text-center">
              <div
                className={`
                  mx-auto max-w-lg p-8 rounded-md
                  ${status === "dragover" ? "bg-blue-50" : "bg-white"}
                `}
              >
                <p className="text-sm text-gray-600 mb-2">
                  Paste a screenshot (Ctrl/Cmd + V) or drag & drop an image here
                </p>
                <div
                  className={`
                    pointer-events-none mx-auto w-48 h-28 rounded-md
                    flex items-center justify-center text-gray-400 text-xs
                    ${status === "dragover" ? "border-2 border-dashed border-blue-300" : "border-2 border-dashed border-gray-200"}
                  `}
                >
                  Drop / Paste Area
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-400">
              Supported: PNG, JPG. Max size: 10MB.
            </div>
          </div>
        )}

        <div className="mt-6">
          {status === "idle" && (
            <p className="text-sm text-gray-600 text-center">
              Waiting for paste or drop...
            </p>
          )}

          {status === "uploading" && (
            <div className="flex items-center gap-2">
              <div className="loader h-4 w-4 rounded-full animate-pulse bg-blue-500" />
              <span className="text-sm text-blue-600">Uploading…</span>
            </div>
          )}

          {status === "error" && (
            <p className="text-sm text-red-600">Upload failed. Try again.</p>
          )}

          {status === "done" && link && (
            <div className="mt-4 flex flex-col gap-4 items-start">
              {/* Link box */}
              <div className="w-full bg-white border rounded-md p-3 flex items-center justify-between gap-4">
                <div className="text-sm text-slate-800 max-w-[70vw] break-words break-all whitespace-normal">
                {link}
                </div>


                <div className="relative flex items-center gap-2">
                  {/* Tooltip */}
                  <div
                    aria-hidden={!tooltipVisible}
                    className={`absolute -top-10 right-0 transform transition-all duration-200 ${
                      tooltipVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none"
                    }`}
                  >
                    <div className="bg-black text-white text-xs px-2 py-1 rounded-md shadow">
                      Copied!
                    </div>
                  </div>

                  <button
                    onClick={copyLink}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    aria-label="Copy link to clipboard"
                  >
                    Copy
                  </button>

                  <button
                    onClick={() => window.open(link, "_blank")}
                    className="px-3 py-1 bg-gray-100 text-slate-800 text-sm rounded hover:bg-gray-200"
                    aria-label="Open link in new tab"
                  >
                    Open
                  </button>

                  <button
                    onClick={resetUpload}
                    className="px-3 py-1 bg-gray-50 text-slate-700 text-sm rounded border hover:bg-gray-100"
                    aria-label="Start new upload"
                  >
                    New Upload
                  </button>
                </div>
              </div>

              {/* Preview */}
              <div className="w-full bg-white border rounded-md p-2">
                <p className="text-xs text-gray-500 mb-2">Preview</p>
                <div className="flex items-center justify-center">
                  <img
                    src={link}
                    alt="Screenshot preview"
                    className="max-h-72 max-w-full rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

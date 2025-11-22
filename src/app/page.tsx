"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [link, setLink] = useState("");

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) uploadScreenshot(file);
        }
      }
    }

    window.addEventListener("paste", handlePaste as any);
    return () => window.removeEventListener("paste", handlePaste as any);
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

      if (data.url) {
        setLink(data.url);
        setStatus("done");
      } else {
        setStatus("error");
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }

  async function copyLink() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
  }

  function resetUpload() {
    setLink("");
    setStatus("idle");
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      {status === "idle" && (
        <p className="text-gray-600 text-lg">Paste a screenshot (Ctrl/Cmd + V)</p>
      )}

      {status === "uploading" && (
        <p className="text-blue-600 font-medium text-lg">Uploading…</p>
      )}

      {status === "done" && (
        <div className="flex flex-col items-center gap-4 w-full max-w-xl">
          <p className="text-green-600 font-semibold">Upload successful!</p>

          {link && (
            <div className="bg-gray-100 p-4 rounded-md w-full break-all border">
              {link}
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={copyLink}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Copy Link
            </button>

            <button
              onClick={resetUpload}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              New Upload
            </button>
          </div>
        </div>
      )}

      {status === "error" && (
        <p className="text-red-600 font-medium">Upload failed. Try again.</p>
      )}
    </main>
  );
}

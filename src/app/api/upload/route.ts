import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const id = nanoid(10);
    const ext = file.type === "image/png" ? "png" : "jpg";
    const filePath = `${id}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // upload
    const { error: uploadError } = await supabaseAdmin.storage
      .from("screenshots")
      .upload(filePath, buffer, { contentType: file.type, upsert: false });

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    // insert DB row with expiry
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { error: dbErr } = await supabaseAdmin
      .from("screenshots")
      .insert([{ id, storage_path: filePath, expires_at: expiresAt }]);

    if (dbErr) {
      await supabaseAdmin.storage.from("screenshots").remove([filePath]);
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }

    // create signed preview URL
    const { data: signedData, error: signedErr } = await supabaseAdmin.storage
      .from("screenshots")
      .createSignedUrl(filePath, 60 * 60 * 24);

    if (signedErr || !signedData?.signedUrl) {
      return NextResponse.json({ error: "Could not create preview URL" }, { status: 500 });
    }

    // shareable app URL
    const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const shareUrl = `${base.replace(/\/$/, "")}/s/${id}`;

    return NextResponse.json({
      id,
      shareUrl,
      previewUrl: signedData.signedUrl,
      expires_at: expiresAt,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

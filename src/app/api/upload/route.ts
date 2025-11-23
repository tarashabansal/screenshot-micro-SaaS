import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // service role client
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const id = nanoid(10);
    const ext = file.type === "image/png" ? "png" : "jpg";
    const filePath = `${id}.${ext}`;

    // Convert File -> Buffer (Node environment)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to private bucket with admin client
    const { error: uploadError } = await supabaseAdmin.storage
      .from("screenshots")
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("uploadError:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // insert DB row with expiry (24 hours)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Use service role client to bypass RLS (safe because server-only)
    const { error: dbErr } = await supabaseAdmin
      .from("screenshots")
      .insert([
        { id, storage_path: filePath, created_at: new Date().toISOString(), expires_at: expiresAt },
      ]);

    if (dbErr) {
      console.error("dbErr:", dbErr);
      // attempt to delete uploaded object if DB insert failed
      await supabaseAdmin.storage.from("screenshots").remove([filePath]);
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }

    // Create signed URL valid for 24 hours (seconds)
    const { data: signedData, error: signedErr } = await supabaseAdmin.storage
      .from("screenshots")
      .createSignedUrl(filePath, 60 * 60 * 24);

    if (signedErr) {
      console.error("signedErr:", signedErr);
      return NextResponse.json({ error: signedErr.message }, { status: 500 });
    }

    return NextResponse.json({ url: signedData.signedUrl, id, expires_at: expiresAt });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

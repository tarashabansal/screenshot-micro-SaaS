import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const id = nanoid(8);
  const ext = file.type === "image/png" ? "png" : "jpg";
  const filePath = `${id}.${ext}`;

  // Upload to the public bucket
  const { error: uploadError } = await supabase.storage
    .from("screenshots")
    .upload(filePath, file);

  if (uploadError) {
    console.error(uploadError);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Get the public URL
  const { data: publicUrlData } = supabase.storage
    .from("screenshots")
    .getPublicUrl(filePath);

  return NextResponse.json({
    url: publicUrlData.publicUrl,  
  });
}

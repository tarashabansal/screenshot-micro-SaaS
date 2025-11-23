import { supabase } from "@/lib/supabase"; 
import { supabaseAdmin } from "@/lib/supabaseAdmin"; 

interface Props {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: Props) {
  const { id } = await params;

  // Fetch DB row (use anon or admin client depending on your RLS)
  const { data, error } = await supabase
    .from("screenshots")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return <p className="p-8 text-center text-red-500">Not found</p>;
  }

  // Check expiry
  if (new Date() > new Date(data.expires_at)) {
    return <p className="p-8 text-center text-red-500">Link expired</p>;
  }

  // Create a signed URL using the admin client (private bucket)
  const { data: signedData, error: signErr } = await supabaseAdmin.storage
    .from("screenshots")
    .createSignedUrl(data.storage_path, 60 * 60 * 24); // 24 hours

  if (signErr || !signedData?.signedUrl) {
    console.error("Signed URL generation error:", signErr);
    return <p className="p-8 text-center text-red-500">Could not generate image link</p>;
  }

  const signedUrl = signedData.signedUrl;
  console.log("SIGNED URL:", signedUrl);

  // Guard: avoid passing invalid value to <img src>
  if (!signedUrl || typeof signedUrl !== "string") {
    return <p className="p-8 text-center text-red-500">Invalid image URL</p>;
  }

  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <img
        src={signedUrl}
        alt="Uploaded Screenshot"
        className="max-h-[90vh] max-w-full rounded"
      />
    </div>
  );
}

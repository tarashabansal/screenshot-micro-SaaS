import { supabase } from "@/lib/supabase";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: Props) {
  const { id } = await params; // ✅ FIX

  // Fetch DB row
  const { data, error } = await supabase
    .from("screenshots")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return <p className="p-8 text-center text-red-500">Not found</p>;
  }

  if (new Date() > new Date(data.expires_at)) {
    return <p className="p-8 text-center text-red-500">Link expired</p>;
  }

  // Fetch public URL (or signed URL)
  const { data: urlData } = supabase.storage
    .from("screenshots")
    .getPublicUrl(data.storage_path);

  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <img 
        src={urlData.publicUrl}
        alt="Uploaded Screenshot"
        className="max-h-[90vh] max-w-full rounded"
      />
    </div>
  );
}

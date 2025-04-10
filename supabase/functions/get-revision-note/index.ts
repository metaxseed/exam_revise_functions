import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { functionHandler } from "../utils/functionHandler.ts"

Deno.serve(functionHandler(async (req, supabase) => {
  if (req.method !== "POST") throw new Error("Method Not Allowed");

  const { payload } = await req.json()

  const { data, error } = await supabase.from("content_revision")
  .select("*")
  .eq("category_id", payload.category_id)
  .eq("topic_h3_id", payload.topic_h3_id)
  .single();

  if (error) throw error;
  
  return {
    success: true,
    data: data,
    message: "Successfully fetched revision note",
  };
}, false));

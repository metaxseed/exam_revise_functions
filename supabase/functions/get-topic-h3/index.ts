import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { functionHandler } from "../utils/functionHandler.ts"

Deno.serve(functionHandler(async (req, supabase) => {
  if (req.method !== "GET") throw new Error("Method Not Allowed");

  const { data, error } = await supabase.from("content_revision")
  .select("topic_h3_id")

  if (error) throw error;

  return {
    success: true,
    data,
    message: "Successfully retrieved topic h3 data"
  }
}, false));

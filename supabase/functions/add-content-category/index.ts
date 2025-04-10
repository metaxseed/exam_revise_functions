import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { functionHandler } from "../utils/functionHandler.ts"

Deno.serve(functionHandler(async (req, supabase) => {
  if (req.method !== "POST") throw new Error("Method Not Allowed");

  const { name } = await req.json();

  const { data, error } = await supabase.from("content_categories").insert({
    name,
  });

  if (error) throw error;

  return {
    success: true,
    data,
    message: "Test",
  };
}, false));

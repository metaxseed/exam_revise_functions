import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { functionHandler } from "../utils/functionHandler"

Deno.serve(functionHandler(async (req, supabase) => {
  if (req.method !== "POST") throw new Error("Method Not Allowed");

  return {
    success: true,
    message: "Test",
  };
}));

import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js";
import { getSecondsBetweenDates } from "./helper.ts";
import { JWTPayload, verifyJWT } from "./auth.ts";
import { corsHeaders } from "../shared/cors.ts";

export interface CustomResponse {
  exec_time_in_seconds: number;
  success: boolean;
  error?: string | null;
  data: any;
}

export function functionHandler(
  handler: (
    req: Request,
    supabase: SupabaseClient,
    payload: JWTPayload | null,
  ) => Promise<any>,
  verifyJwt: boolean = true,
) {
  return async (req: Request): Promise<Response> => {
    if(req.method === "OPTIONS") {
      return new Response("ok", {
        status: 200,
        headers: corsHeaders,
      });
    }

    const startTimestamp = new Date();

    const supabaseUrl = Deno.env.get("MY_SUPABASE_URL") ||
      Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("MY_SUPABASE_SERVICE_ROLE_KEY") ||
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      const responseData: CustomResponse = {
        exec_time_in_seconds: getSecondsBetweenDates(
          startTimestamp,
          new Date(),
        ),
        success: false,
        error: "Missing required environment variables",
        data: null,
      };
      return new Response(JSON.stringify(responseData), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
      let payload: JWTPayload | null = null;
      if (verifyJwt) {
        payload = await verifyJWT(req);
      }
      const data = await handler(req, supabase, payload);
      let responseData: CustomResponse;
      if(Object.keys(data).includes("data")) {
        responseData = {
          exec_time_in_seconds: getSecondsBetweenDates(
            startTimestamp,
            new Date(),
          ),
          success: true,
          ...data,
        };
      }
      else {
        responseData = {
          exec_time_in_seconds: getSecondsBetweenDates(
            startTimestamp,
            new Date(),
          ),
          success: true,
          data,
        };
      }
      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      const responseData: CustomResponse = {
        exec_time_in_seconds: getSecondsBetweenDates(
          startTimestamp,
          new Date(),
        ),
        success: false,
        error: (error as Error).message,
        data: null,
      };
      return new Response(JSON.stringify(responseData), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  };
}

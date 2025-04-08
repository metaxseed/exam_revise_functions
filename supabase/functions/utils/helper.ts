import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js";

export function getSecondsBetweenDates(date1: Date, date2: Date): number {
  const millisecondsBetween = Math.abs(date1.getTime() - date2.getTime());
  return Math.floor(millisecondsBetween / 1000);
}

export function chunkArray(array: any[], size: number) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

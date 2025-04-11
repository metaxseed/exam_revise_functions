import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { functionHandler } from "../utils/functionHandler.ts"

Deno.serve(functionHandler(async (req, supabase) => {
  if (req.method !== "POST") throw new Error("Method Not Allowed");
  
  const { payload } = await req.json();

  // Add additional fields to the payload
  payload.meta_data = null; // Include meta_data as an empty object
  payload.created_at = new Date(); // Set created_at to the current date
  payload.updated_at = new Date(); // Set updated_at to the current date

  // Validate if the subject_name already exists
  const { data: existingSubjectsByName, error: existingSubjectError } = await supabase
    .from("subject")
    .select("*")
    .eq("subject_name", payload.subject_name); // No .single() here

  if (existingSubjectError) throw existingSubjectError;

  // Check if any subjects with the same name exist
  if (existingSubjectsByName.length > 0) {
    throw new Error("A subject with the same subject_name already exists.");
  }

  // Proceed with the insert operation
  const { data: insertedData, error } = await supabase.from("subject").insert([payload]); // Wrap payload in an array

  if (error) throw error;

  // Check if insertedData is not null or undefined
  if (!insertedData || insertedData.length === 0) {
    throw new Error("Failed to insert the subject.");
  }

  // Return the added data
  return {
    success: true,
    message: "Successfully added subject",
    data: insertedData[0], // Return the first inserted subject
  };
}, false));

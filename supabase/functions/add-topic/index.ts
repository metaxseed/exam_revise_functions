import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { functionHandler } from "../utils/functionHandler.ts"

Deno.serve(functionHandler(async (req, supabase) => {
  if (req.method !== "POST") throw new Error("Method Not Allowed");

  const { payload } = await req.json();

  switch (payload.type) {
    case "topic_h1":
      return await addTopicH1(supabase, payload);
    case "topic_h2":
      return await addTopicH2(supabase, payload);
    case "topic_h3":
      return await addTopicH3(supabase, payload);
    default:
      throw new Error("Invalid topic type");
  }
}, false));

const addTopicH1 = async (supabase: SupabaseClient, payload: any) => {
  // Add additional fields to the payload
  payload.meta_data = null; // Include meta_data as an empty object
  payload.created_at = new Date(); // Set created_at to the current date
  payload.updated_at = new Date(); // Set updated_at to the current date

  // Validate if the combination of subject_id and topic_parent_name already exists
  const { data: existingTopics, error: existingTopicError } = await supabase
    .from("topic_h1")
    .select("*")
    .eq("subject_id", payload.subject_id)
    .eq("topic_parent_name", payload.topic_parent_name); // Check for uniqueness

  if (existingTopicError) throw existingTopicError;

  if (existingTopics.length > 0) {
    throw new Error("A topic with the same subject_id and topic_parent_name already exists.");
  }

  // Proceed to insert new topic_h1 data
  const { data, error } = await supabase.from("topic_h1").insert([payload]); // Wrap payload in an array
  if (error) throw error;

  return {
    success: true,
    data: data[0], // Return the inserted topic_h1
    message: "Successfully added topic h1 data"
  };
}

const addTopicH2 = async (supabase: SupabaseClient, payload: any) => {
  // Add additional fields to the payload
  payload.meta_data = null; // Include meta_data as an empty object
  payload.created_at = new Date(); // Set created_at to the current date
  payload.updated_at = new Date(); // Set updated_at to the current date

  // Validate if the combination of topic_h1_id, subject_id, and topic_h2_name already exists
  const { data: existingTopics, error: existingTopicError } = await supabase
    .from("topic_h2")
    .select("*")
    .eq("topic_h1_id", payload.topic_h1_id)
    .eq("subject_id", payload.subject_id)
    .eq("topic_h2_name", payload.topic_h2_name); // Check for uniqueness

  if (existingTopicError) throw existingTopicError;

  if (existingTopics.length > 0) {
    throw new Error("A topic with the same topic_h1_id, subject_id, and topic_h2_name already exists.");
  }

  // Proceed to insert new topic_h2 data
  const { data, error } = await supabase.from("topic_h2").insert([payload]); // Wrap payload in an array
  if (error) throw error;

  return {
    success: true,
    data: data[0], // Return the inserted topic_h2
    message: "Successfully added topic h2 data"
  };
}

const addTopicH3 = async (supabase: SupabaseClient, payload: any) => {
  // Add additional fields to the payload
  payload.meta_data = null; // Include meta_data as an empty object
  payload.created_at = new Date(); // Set created_at to the current date
  payload.updated_at = new Date(); // Set updated_at to the current date

  // Validate if the combination of topic_h2_id, subject_id, and topic_h3_name already exists
  const { data: existingTopics, error: existingTopicError } = await supabase
    .from("topic_h3")
    .select("*")
    .eq("topic_h2_id", payload.topic_h2_id)
    .eq("subject_id", payload.subject_id)
    .eq("topic_h3_name", payload.topic_h3_name); // Check for uniqueness

  if (existingTopicError) throw existingTopicError;

  if (existingTopics.length > 0) {
    throw new Error("A topic with the same topic_h2_id, subject_id, and topic_h3_name already exists.");
  }

  // Proceed to insert new topic_h3 data
  const { data, error } = await supabase.from("topic_h3").insert([payload]); // Wrap payload in an array
  if (error) throw error;

  return {
    success: true,
    data: data[0], // Return the inserted topic_h3
    message: "Successfully added topic h3 data"
  };
}

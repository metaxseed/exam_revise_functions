import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { functionHandler } from "../utils/functionHandler.ts"

Deno.serve(functionHandler(async (req, supabase) => {
  if (req.method !== "POST") throw new Error("Method Not Allowed");

  const { payload } = await req.json();
  const { type, ...data } = payload;

  switch (type) {
    case "topic_h1":
      return await addTopicH1(supabase, data);
    case "topic_h2":
      return await addTopicH2(supabase, data);
    case "topic_h3":
      return await addTopicH3(supabase, data);
    default:
      throw new Error("Invalid topic type");
  }
}, false));

const addTopicH1 = async (supabase: SupabaseClient, data: any) => {
  // Add additional fields to the payload
  const payload = {
    ...data,
    meta_data: null,
    created_at: new Date(),
    updated_at: new Date()
  }

  // Validate if the combination of subject_id and topic_parent_name already exists
  const { data: existingTopics, error: existingTopicError } = await supabase
    .from("topic_h1")
    .select("*")
    .eq("subject_id", data.subject_id)
    .eq("topic_parent_name", data.topic_parent_name);

  if (existingTopicError) throw existingTopicError;

  // Log or inspect the existingTopics
  console.log('Existing topics check:', existingTopics);

  if (existingTopics && existingTopics.length > 0) {
    throw new Error("A topic with the same subject_id and topic_parent_name already exists.");
  }

  // Proceed to insert new topic_h1 data
  const { data: insertedData, error } = await supabase
    .from("topic_h1")
    .insert([payload])
    .select();
    
  if (error) throw error;

  return {
    success: true,
    data: insertedData[0],
    message: "Successfully added topic h1 data"
  };
}

const addTopicH2 = async (supabase: SupabaseClient, data: any) => {
  // Add additional fields to the payload
  const payload = {
    ...data,
    meta_data: null,
    created_at: new Date(),
    updated_at: new Date()
  }

  // Validate if the combination of topic_h1_id, subject_id, and topic_h2_name already exists
  const { data: existingTopics, error: existingTopicError } = await supabase
    .from("topic_h2")
    .select("*")
    .eq("topic_h1_id", data.topic_h1_id)
    .eq("subject_id", data.subject_id)
    .eq("topic_h2_name", data.topic_h2_name);

  if (existingTopicError) throw existingTopicError;

  // Add more robust check for existing topics
  if (existingTopics && existingTopics.length > 0) {
    throw new Error("A topic with the same topic_h1_id, subject_id, and topic_h2_name already exists.");
  }

  // Proceed to insert new topic_h2 data and make sure to get the inserted data back
  const { data: insertedData, error } = await supabase
    .from("topic_h2")
    .insert([payload])
    .select();
    
  if (error) throw error;

  return {
    success: true,
    data: insertedData[0],
    message: "Successfully added topic h2 data"
  };
}

const addTopicH3 = async (supabase: SupabaseClient, data: any) => {
  // Add additional fields to the payload
  const payload = {
    ...data,
    meta_data: null,
    created_at: new Date(),
    updated_at: new Date()
  }

  // Validate if the combination of topic_h2_id, subject_id, and topic_h3_name already exists
  const { data: existingTopics, error: existingTopicError } = await supabase
    .from("topic_h3")
    .select("*")
    .eq("topic_h2_id", data.topic_h2_id)
    .eq("subject_id", data.subject_id)
    .eq("topic_h3_name", data.topic_h3_name);

  if (existingTopicError) throw existingTopicError;

  // Add more robust check for existing topics
  if (existingTopics && existingTopics.length > 0) {
    throw new Error("A topic with the same topic_h2_id, subject_id, and topic_h3_name already exists.");
  }

  // Proceed to insert new topic_h3 data and make sure to get the inserted data back
  const { data: insertedData, error } = await supabase
    .from("topic_h3")
    .insert([payload])
    .select();
    
  if (error) throw error;

  return {
    success: true,
    data: insertedData[0],
    message: "Successfully added topic h3 data"
  };
}

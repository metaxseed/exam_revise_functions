import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { functionHandler } from "../utils/functionHandler.ts"

Deno.serve(functionHandler(async (req, supabase) => {
  if (req.method !== "GET") throw new Error("Method Not Allowed");

  const { data: subject, error: subject_error } = await supabase.from("subject")
  .select("*")
  
  if (subject_error) throw subject_error;

  // Create a structured response
  const structuredResponse = await Promise.all(subject.map(async (subj) => {
    const { data: topic_h1, error: topic_h1_error } = await supabase.from("topic_h1")
      .select("*")
      .eq("subject_id", subj.subject_id);

    if (topic_h1_error) throw topic_h1_error;

    const topicsH1WithChildren = await Promise.all(topic_h1.map(async (h1) => {
      const { data: topic_h2, error: topic_h2_error } = await supabase.from("topic_h2")
        .select("*")
        .eq("subject_id", subj.subject_id)
        .eq("topic_h1_id", h1.topic_h1_id);

      if (topic_h2_error) throw topic_h2_error;

      const topicsH2WithChildren = await Promise.all(topic_h2.map(async (h2) => {
        const { data: topic_h3, error: topic_h3_error } = await supabase.from("topic_h3")
          .select("*")
          .eq("subject_id", subj.subject_id)
          .eq("topic_h2_id", h2.topic_h2_id);

        if (topic_h3_error) throw topic_h3_error;

        return {
          ...h2,
          topics_h3: topic_h3
        };
      }));

      return {
        ...h1,
        topics_h2: topicsH2WithChildren
      };
    }));

    return {
      ...subj,
      topics_h1: topicsH1WithChildren
    };
  }));

  return {
    success: true,
    message: "Successfully retrieved hierarchical subject data",
    data: structuredResponse
  }
}, false));

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { functionHandler } from "../utils/functionHandler.ts"

Deno.serve(functionHandler(async (req, supabase) => {
  if (req.method !== "POST") throw new Error("Method Not Allowed");

  const {
    content_data
  } = await req.json()

  const { data, error } = await supabase.from("content_revision")
  .insert({
    category_id: content_data.category_id,
    topic_h3_id: content_data.topic_h3_id,
    revision_notes: content_data.content,
    revision_tips: content_data.revisionTips,
    revision_examples: content_data.revisionExamples,
    video_link: content_data.videoLink,
    status: content_data.status,
    author: content_data.author,
    reviewer: content_data.reviewer,
    submission_date: new Date(),
    review_date: null,
    publish_date: null,
    rejection_comment: null,
    rejection_uid: null,
    meta_data: {},
    created_at: new Date(),
    updated_at: new Date(),
  });

  if (error) throw error;

  return {
    success: true,
    data: content_data,
    message: "Test",
  };
}, false));

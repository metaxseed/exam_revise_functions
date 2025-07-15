// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { 
  serveHonoFunction, 
  successResponse, 
  errorResponse, 
  handleDatabaseError,
  type HandlerContext 
} from "../utils/functionWrapper.ts"

// Mock data for development
const getMockData = (subject_id: any) => {
  if (subject_id === '1' || subject_id === 1) {
    return {
      revision_id: 1,
      title: "Mathematical Symbols",
      author: "Jhune Rose Madrinan",
      reviewer: "Shipon Chowdhury",
      author_image: "",
      reviewer_image: "",
      updated_at: "2025-04-29T00:00:00.000Z",
      revision_notes: {
        "root": {
          "children": [
            {
              "children": [
                {
                  "detail": 0,
                  "format": 1,
                  "mode": "normal",
                  "style": "color: #d1760d;",
                  "text": "What are the math symbols I need to know?",
                  "type": "text",
                  "version": 1
                }
              ],
              "direction": "ltr",
              "format": "",
              "indent": 0,
              "type": "heading",
              "version": 1,
              "tag": "h1"
            },
            {
              "children": [
                {
                  "detail": 0,
                  "format": 1,
                  "mode": "normal",
                  "style": "",
                  "text": "Basic Four Operations",
                  "type": "text",
                  "version": 1
                }
              ],
              "direction": "ltr",
              "format": "",
              "indent": 0,
              "type": "heading",
              "version": 1,
              "tag": "h2"
            },
            {
              "children": [
                {
                  "detail": 0,
                  "format": 1,
                  "mode": "normal",
                  "style": "",
                  "text": "Addition (Plus, Sum, Total)",
                  "type": "text",
                  "version": 1
                }
              ],
              "direction": "ltr",
              "format": "",
              "indent": 0,
              "type": "paragraph",
              "version": 1
            }
          ],
          "direction": "ltr",
          "format": "",
          "indent": 0,
          "type": "root",
          "version": 1
        }
      },
      revision_tips: null,
      revision_examples: null,
      video_link: null
    };
  }

  return null;
};

// Content Notes handler function - based on get-revision-content-v3.ts
async function handleContentNotes(ctx: HandlerContext) {
  const { c, supabase } = ctx

  try {
    // Only allow GET requests
    if (c.req.method !== 'GET') {
      return c.json(errorResponse('Method not allowed'), 405)
    }

    // Get subject_id from query parameters
    const url = new URL(c.req.url)
    const subject_id = url.searchParams.get('subject_id')

    if (!subject_id) {
      return c.json(errorResponse('subject_id is required'), 400)
    }

    // Check if we're in development mode (check environment variable)
    const nodeEnv = Deno.env.get('NODE_ENV') || Deno.env.get('DENO_ENV')
    
    // In development, try mock data first
    if (nodeEnv === 'development') {
      const mockData = getMockData(subject_id)
      if (mockData) {
        console.log('Serving mock data for subject_id:', subject_id)
        return c.json(successResponse(mockData, "Mock data retrieved successfully"))
      }
    }

    // First, try to get content_id for the subject from subject_topics
    const { data: subjectTopicData, error: subjectTopicError } = await supabase
      .from('subject_topics')
      .select('content_id')
      .eq('subject_id', subject_id)
      .limit(1)

    if (subjectTopicError) {
      console.error('Error fetching subject topics:', subjectTopicError)
    } else if (subjectTopicData && subjectTopicData.length > 0 && subjectTopicData[0].content_id) {
      // If found content_id, fetch content_revision
      const { data, error } = await supabase
        .from('content_revision')
        .select(`
          revision_id,
          title,
          author,
          reviewer,
          updated_at,
          revision_notes,
          revision_tips,
          revision_examples,
          video_link,
          section_array
        `)
        .eq('revision_id', subjectTopicData[0].content_id)
        .single()

      if (error) {
        console.error('Error fetching revision with content_id:', error)
      } else if (data) {
        return c.json(successResponse(data, "Content revision retrieved successfully"))
      }
    }

    // As a fallback, try using subject_id directly as topics_id
    const { data, error } = await supabase
      .from('content_revision')
      .select(`
        revision_id,
        title,
        author,
        reviewer,
        updated_at,
        revision_notes,
        revision_tips,
        revision_examples,
        video_link,
        section_array
      `)
      .eq('topics_id', subject_id)
      .single()

    if (error) {
      console.error('Error fetching revision with topics_id:', error)
      return c.json(errorResponse('No revision content found for the given ID'), 404)
    }

    if (!data) {
      return c.json(errorResponse('No revision content found for the given ID'), 404)
    }

    return c.json(successResponse(data, "Content revision retrieved successfully"))
  } catch (error) {
    console.error('Error in content_notes function:', error)
    return c.json(errorResponse(`Failed to fetch content notes: ${error.message}`), 500)
  }
}

// Serve the function with default configuration
serveHonoFunction(handleContentNotes, {
  enableCors: true,
  enableLogging: true,
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
})

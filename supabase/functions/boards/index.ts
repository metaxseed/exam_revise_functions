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

// Boards handler function - focused only on business logic
async function handleBoards(ctx: HandlerContext) {
  const { c, supabase } = ctx

  try {
    // Only allow GET requests
    if (c.req.method !== 'GET') {
      return c.json(errorResponse('Method not allowed'), 405)
    }

    // Get exam_short_name from query parameters
    const url = new URL(c.req.url)
    const exam_short_name = url.searchParams.get('exam_short_name')

    let query = supabase.from('board').select('*')

    // If exam_short_name is provided, filter boards by those used in the exam
    if (exam_short_name) {
      // First find the exam to get its board_id
      const { data: examData, error: examError } = await supabase
        .from('exam')
        .select('board_id')
        .ilike('exam_short_name', exam_short_name)
        .limit(1)

      if (examError) {
        console.error('Error fetching exam:', examError)
      } else if (examData && examData.length > 0) {
        // If we found the exam, filter boards by its board_id
        query = query.eq('board_id', examData[0].board_id)
      }
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching boards:', error)
      const dbError = handleDatabaseError(error)
      return c.json(dbError, 500)
    }

    // If no boards found or database is empty, return default data
    if (!data || data.length === 0) {
      const defaultBoards = [
        {
          board_id: 1,
          board_short_name: "Edexcel",
          board_long_name: "Pearsons Edexcel"
        },
        {
          board_id: 2,
          board_short_name: "Cambridge",
          board_long_name: "Cambridge (CIE)"
        },
        {
          board_id: 3,
          board_short_name: "Oxford AQA",
          board_long_name: "Oxford AQA"
        }
      ]
      
      return c.json(successResponse(defaultBoards, "Using default boards data"))
    }

    return c.json(successResponse(data, "Boards retrieved successfully"))
  } catch (error) {
    console.error('Error in boards function:', error)
    return c.json(errorResponse(`Failed to fetch boards: ${error.message}`), 500)
  }
}

// Serve the function with default configuration
serveHonoFunction(handleBoards, {
  enableCors: true,
  enableLogging: true,
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
})

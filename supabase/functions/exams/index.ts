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

interface ExamResponse {
  exam_id: number
  exam_short_name: string
  exam_long_name: string
  board_short_name: string
  board_long_name: string
}

// Exams handler function - focused only on business logic
async function handleExams(ctx: HandlerContext) {
  const { c, supabase } = ctx

  try {
    // Only allow GET requests
    if (c.req.method !== 'GET') {
      return c.json(errorResponse('Method not allowed'), 405)
    }

    // Fetch exams with board information
    const { data, error } = await supabase
      .from('exam')
      .select(`
        exam_id,
        exam_short_name,
        exam_long_name,
        board:board_id (
          board_short_name,
          board_long_name
        )
      `)

    if (error) {
      console.error('Error fetching exams:', error)
      const dbError = handleDatabaseError(error)
      return c.json(dbError, 500)
    }

    // Transform the data to include board information at the top level
    const transformedData: ExamResponse[] = data.map((exam: any) => ({
      exam_id: exam.exam_id,
      exam_short_name: exam.exam_short_name,
      exam_long_name: exam.exam_long_name,
      board_short_name: exam.board?.board_short_name || 'Unknown',
      board_long_name: exam.board?.board_long_name || 'Unknown Board'
    }))

    return c.json(successResponse(transformedData, "Exams retrieved successfully"))
  } catch (error) {
    console.error('Error in exams function:', error)
    return c.json(errorResponse(`Failed to fetch exams: ${error.message}`), 500)
  }
}

// Serve the function with default configuration
serveHonoFunction(handleExams, {
  enableCors: true,
  enableLogging: true,
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
})

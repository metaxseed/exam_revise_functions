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

    // Get query parameters
    const url = new URL(c.req.url)
    const exam_short_name = url.searchParams.get('exam_short_name')
    const board_id = url.searchParams.get('board_id')

    // If both exam_short_name and board_id are provided, find specific exam (for subject ID lookup)
    if (exam_short_name && board_id) {
      console.log('🔍 Finding exam by exam_short_name and board_id:', { exam_short_name, board_id })
      
      const { data: examData, error: examError } = await supabase
        .from('exam')
        .select('exam_id, exam_short_name, exam_long_name')
        .ilike('exam_short_name', exam_short_name)
        .eq('board_id', parseInt(board_id))
        .maybeSingle()

      if (examError) {
        console.error('Exam query error:', examError)
        const dbError = handleDatabaseError(examError)
        return c.json(dbError, 500)
      }

      if (!examData?.exam_id) {
        console.error('Exam not found for:', { exam_short_name, board_id })
        return c.json(errorResponse('Exam not found'), 404)
      }

      console.log("✅ Exam found:", examData)
      
      // Return exam data in the same format as the general query
      const transformedData: ExamResponse = {
        exam_id: examData.exam_id,
        exam_short_name: examData.exam_short_name,
        exam_long_name: examData.exam_long_name,
        board_short_name: 'Unknown', // We don't need this for subject lookup
        board_long_name: 'Unknown Board'
      }

      return c.json(successResponse([transformedData], "Exam retrieved successfully"))
    }

    // Fetch exams with board information (general query)
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

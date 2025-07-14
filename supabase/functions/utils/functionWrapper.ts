import { Hono } from 'https://deno.land/x/hono@v3.11.8/mod.ts'
import { cors } from 'https://deno.land/x/hono@v3.11.8/middleware.ts'
import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export interface HonoContext {
  req: Request
  json: (data: any, status?: number) => Response
  text: (text: string, status?: number) => Response
  status: (status: number) => Response
}

export interface FunctionConfig {
  enableCors?: boolean
  enableLogging?: boolean
  allowedMethods?: string[]
  allowedOrigins?: string | string[]
}

export interface HandlerContext {
  c: HonoContext
  supabase: SupabaseClient
  env: {
    SUPABASE_URL: string
    SUPABASE_ANON_KEY: string
  }
}

export type HandlerFunction = (ctx: HandlerContext) => Promise<Response>

const defaultConfig: FunctionConfig = {
  enableCors: true,
  enableLogging: true,
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedOrigins: '*'
}

export function createHonoFunction(
  handler: HandlerFunction,
  config: FunctionConfig = {}
): Hono {
  const finalConfig = { ...defaultConfig, ...config }
  const app = new Hono()

  // CORS Middleware
  if (finalConfig.enableCors) {
    app.use('*', cors({
      origin: finalConfig.allowedOrigins as string,
      allowHeaders: ['authorization', 'x-client-info', 'apikey', 'content-type'],
      allowMethods: finalConfig.allowedMethods as string[]
    }))
  }

  // Request Logging Middleware
  if (finalConfig.enableLogging) {
    app.use('*', async (c, next) => {
      console.log(`${c.req.method} ${c.req.url}`)
      await next()
    })
  }

  // Environment Variables Setup
  app.use('*', async (c, next) => {
    // Get environment variables with fallbacks
    const supabaseUrl = Deno.env.get('_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('_SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseKey) {
      return c.json({ 
        success: false,
        error: 'Missing environment variables' 
      }, 500)
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Store in context for handler
    c.set('supabase', supabase)
    c.set('env', { SUPABASE_URL: supabaseUrl, SUPABASE_ANON_KEY: supabaseKey })

    await next()
  })

  // Main handler route (catches all paths)
  app.get('/*', async (c) => {
    try {
      const supabase = c.get('supabase') as SupabaseClient
      const env = c.get('env') as { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }
      
      const context: HandlerContext = {
        c: c as HonoContext,
        supabase,
        env
      }

      return await handler(context)
    } catch (error) {
      console.error('Handler error:', error)
      return c.json({ 
        success: false,
        error: `Function error: ${error.message}` 
      }, 500)
    }
  })

  // Support other HTTP methods
  app.post('/*', async (c) => {
    try {
      const supabase = c.get('supabase') as SupabaseClient
      const env = c.get('env') as { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }
      
      const context: HandlerContext = {
        c: c as HonoContext,
        supabase,
        env
      }

      return await handler(context)
    } catch (error) {
      console.error('Handler error:', error)
      return c.json({ 
        success: false,
        error: `Function error: ${error.message}` 
      }, 500)
    }
  })

  // Support OPTIONS requests for CORS
  app.options('/*', async (c) => {
    try {
      const supabase = c.get('supabase') as SupabaseClient
      const env = c.get('env') as { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }
      
      const context: HandlerContext = {
        c: c as HonoContext,
        supabase,
        env
      }

      return await handler(context)
    } catch (error) {
      console.error('Handler error:', error)
      return c.json({ 
        success: false,
        error: `Function error: ${error.message}` 
      }, 500)
    }
  })

  // Support other HTTP methods like PUT, DELETE, etc.
  app.put('/*', async (c) => {
    try {
      const supabase = c.get('supabase') as SupabaseClient
      const env = c.get('env') as { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }
      
      const context: HandlerContext = {
        c: c as HonoContext,
        supabase,
        env
      }

      return await handler(context)
    } catch (error) {
      console.error('Handler error:', error)
      return c.json({ 
        success: false,
        error: `Function error: ${error.message}` 
      }, 500)
    }
  })

  app.delete('/*', async (c) => {
    try {
      const supabase = c.get('supabase') as SupabaseClient
      const env = c.get('env') as { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }
      
      const context: HandlerContext = {
        c: c as HonoContext,
        supabase,
        env
      }

      return await handler(context)
    } catch (error) {
      console.error('Handler error:', error)
      return c.json({ 
        success: false,
        error: `Function error: ${error.message}` 
      }, 500)
    }
  })

  // 404 Handler
  app.notFound((c) => {
    return c.json({ 
      success: false,
      error: 'Endpoint not found' 
    }, 404)
  })

  // Global Error Handler
  app.onError((error, c) => {
    console.error('Global error:', error)
    return c.json({
      success: false,
      error: 'Internal server error'
    }, 500)
  })

  return app
}

export function serveHonoFunction(
  handler: HandlerFunction,
  config: FunctionConfig = {}
): void {
  const app = createHonoFunction(handler, config)
  Deno.serve(app.fetch)
}

// Helper function for standard success responses
export function successResponse(data: any, message: string = 'Success'): any {
  return {
    success: true,
    message,
    data
  }
}

// Helper function for standard error responses
export function errorResponse(error: string, code?: string): any {
  return {
    success: false,
    error,
    ...(code && { code })
  }
}

// Helper function for handling database errors
export function handleDatabaseError(error: any): any {
  console.error('Database error:', error)
  
  // Handle specific Supabase/PostgreSQL errors
  if (error.code === 'PGRST116') {
    return errorResponse('No data found', 'NOT_FOUND')
  }
  
  if (error.code === '42P01') {
    return errorResponse('Table does not exist', 'TABLE_NOT_FOUND')
  }
  
  if (error.code === '23505') {
    return errorResponse('Duplicate entry', 'DUPLICATE_ENTRY')
  }
  
  return errorResponse(`Database error: ${error.message}`, error.code)
} 

import { NextResponse } from 'next/server'

/**
 * Database Diagnostic Endpoint
 * Returns detailed info about DB configuration for debugging Vercel deployment issues.
 * This endpoint handles ALL errors gracefully - it should never return 500.
 */
export async function GET() {
    const diagnostic: Record<string, unknown> = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        step: 'init',
    }

    try {
        // Step 1: Check DATABASE_URL format (without exposing the actual value)
        const dbUrl = process.env.DATABASE_URL || ''
        diagnostic.dbUrlProtocol = dbUrl ? dbUrl.split(':')[0] + '://' : 'NOT_SET'
        diagnostic.dbUrlLength = dbUrl.length
        diagnostic.dbUrlContainsFile = dbUrl.startsWith('file:')
        diagnostic.dbUrlContainsPostgres = dbUrl.startsWith('postgresql:') || dbUrl.startsWith('postgres:')
        diagnostic.step = 'env_check'

        // Step 2: Try to import and check Prisma client
        try {
            const { PrismaClient } = await import('@prisma/client')
            diagnostic.prismaClientImportable = true
            diagnostic.step = 'prisma_import'

            // Step 3: Try to create Prisma client
            let prisma: InstanceType<typeof PrismaClient>
            try {
                prisma = new PrismaClient()
                diagnostic.prismaClientCreated = true
                diagnostic.step = 'prisma_create'
            } catch (createError) {
                diagnostic.prismaClientCreated = false
                diagnostic.prismaCreateError = createError instanceof Error ? createError.message : String(createError)
                diagnostic.prismaCreateErrorType = createError instanceof Error ? createError.constructor.name : 'Unknown'
                diagnostic.step = 'prisma_create_failed'

                return NextResponse.json({
                    ...diagnostic,
                    status: 'ERROR',
                    summary: 'Prisma client creation failed. Schema provider may not match DATABASE_URL.',
                    fix: diagnostic.dbUrlContainsPostgres
                        ? 'DATABASE_URL is PostgreSQL but schema.prisma may have provider = "sqlite". Change to provider = "postgresql" and redeploy.'
                        : diagnostic.dbUrlContainsFile
                            ? 'DATABASE_URL is SQLite but schema.prisma may have provider = "postgresql". For Vercel, use a PostgreSQL database.'
                            : 'DATABASE_URL protocol is unexpected. Use postgresql:// for Vercel or file: for local dev.',
                })
            }

            // Step 4: Try a simple query
            try {
                const result = await prisma.$queryRaw`SELECT 1 as test`
                diagnostic.dbQuerySuccessful = true
                diagnostic.dbQueryResult = typeof result === 'object' ? 'query_returned_data' : String(result)
                diagnostic.step = 'query_success'
            } catch (queryError) {
                diagnostic.dbQuerySuccessful = false
                const errMsg = queryError instanceof Error ? queryError.message : String(queryError)
                diagnostic.dbQueryError = errMsg.substring(0, 500) // Truncate long errors
                diagnostic.dbQueryErrorType = queryError instanceof Error ? queryError.constructor.name : 'Unknown'

                if (errMsg.includes('file:') || errMsg.includes('protocol') || errMsg.includes('url must start')) {
                    diagnostic.dbQueryErrorSummary = 'SCHEMA_MISMATCH: Prisma schema provider does not match DATABASE_URL protocol'
                    diagnostic.dbQueryErrorFix = diagnostic.dbUrlContainsPostgres
                        ? 'DATABASE_URL is PostgreSQL but schema.prisma has provider = "sqlite". Change to provider = "postgresql" and redeploy.'
                        : 'DATABASE_URL is SQLite but schema.prisma has provider = "postgresql". For Vercel, use PostgreSQL.'
                } else if (errMsg.includes('connect') || errMsg.includes('ECONNREFUSED') || errMsg.includes('timeout') || errMsg.includes("can't reach")) {
                    diagnostic.dbQueryErrorSummary = 'CONNECTION_FAILED: Cannot reach database server'
                    diagnostic.dbQueryErrorFix = 'Check that DATABASE_URL is correct and the database server is accessible.'
                } else if (errMsg.includes('does not exist') || errMsg.includes('database') && errMsg.includes('not')) {
                    diagnostic.dbQueryErrorSummary = 'DATABASE_NOT_FOUND: Database does not exist or tables not created'
                    diagnostic.dbQueryErrorFix = 'Run `npx prisma db push` with the correct DATABASE_URL to create tables.'
                } else if (errMsg.includes('authentication') || errMsg.includes('password') || errMsg.includes('access') || errMsg.includes('P1000')) {
                    diagnostic.dbQueryErrorSummary = 'AUTH_FAILED: Database authentication failed'
                    diagnostic.dbQueryErrorFix = 'Check the username and password in DATABASE_URL.'
                } else {
                    diagnostic.dbQueryErrorSummary = 'UNKNOWN_DB_ERROR'
                    diagnostic.dbQueryErrorFix = 'Check Vercel function logs for more details.'
                }

                diagnostic.step = 'query_failed'
            }

            // Step 5: Check if AdminUser table exists
            if (diagnostic.dbQuerySuccessful) {
                try {
                    const adminCount = await prisma.adminUser.count()
                    diagnostic.adminUserCount = adminCount
                    diagnostic.adminTableExists = true

                    const defaultAdmin = await prisma.adminUser.findUnique({ where: { username: 'admin' } })
                    diagnostic.defaultAdminExists = !!defaultAdmin
                    diagnostic.needsSetup = adminCount === 0
                    diagnostic.step = 'complete'
                } catch (adminError) {
                    diagnostic.adminTableExists = false
                    const adminErr = adminError instanceof Error ? adminError.message : String(adminError)
                    diagnostic.adminCheckError = adminErr.substring(0, 300)
                    diagnostic.adminCheckFix = 'Tables not created. Run `npx prisma db push` with the correct DATABASE_URL.'
                    diagnostic.needsDbPush = true
                    diagnostic.step = 'admin_check_failed'
                }

                try { await prisma.$disconnect() } catch { }
            } else {
                try { await prisma.$disconnect() } catch { }
            }

        } catch (importError) {
            diagnostic.prismaClientImportable = false
            diagnostic.prismaImportError = importError instanceof Error ? importError.message.substring(0, 300) : String(importError).substring(0, 300)
            diagnostic.step = 'prisma_import_failed'
            diagnostic.prismaImportFix = 'Prisma client not generated. Ensure `npx prisma generate` runs during Vercel build.'
        }

        const status = diagnostic.dbQuerySuccessful ? 'OK' : 'ERROR'

        return NextResponse.json({
            ...diagnostic,
            status,
            summary: status === 'OK'
                ? 'Database is connected and working.'
                : 'Database connection failed. See error details above.',
        })

    } catch (unexpectedError) {
        return NextResponse.json({
            timestamp: new Date().toISOString(),
            status: 'FATAL_ERROR',
            step: 'unexpected_error',
            unexpectedError: unexpectedError instanceof Error ? unexpectedError.message.substring(0, 300) : String(unexpectedError).substring(0, 300),
            unexpectedErrorType: unexpectedError instanceof Error ? unexpectedError.constructor.name : 'Unknown',
            summary: 'An unexpected error occurred during diagnostics.',
        })
    }
}

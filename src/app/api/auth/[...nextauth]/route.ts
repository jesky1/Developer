import NextAuth, { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { comparePassword, getUserByEmail, createUser, signUserToken } from '@/lib/user-auth'
import { db } from '@/lib/db'

export const authOptions: NextAuthOptions = {
  providers: [
    // ===== Google OAuth Provider =====
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'placeholder-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'placeholder-client-secret',
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),

    // ===== Credentials Provider =====
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email dan password harus diisi')
        }

        const email = credentials.email.trim().toLowerCase()
        const user = await getUserByEmail(email)

        if (!user) {
          throw new Error('Email atau password salah')
        }

        if (!user.isActive) {
          throw new Error('Akun Anda dinonaktifkan')
        }

        // For OAuth-only users, they can't login with credentials
        if (!user.passwordHash) {
          throw new Error('Akun ini terdaftar via Google. Silakan login dengan Google.')
        }

        const isValid = await comparePassword(credentials.password, user.passwordHash)

        if (!isValid) {
          throw new Error('Email atau password salah')
        }

        // Update last login (non-blocking)
        db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        }).catch(() => { })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          provider: user.provider,
        }
      },
    }),
  ],

  callbacks: {
    // ===== SignIn callback — Handle Google OAuth user creation =====
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' && profile?.email) {
        try {
          const existingUser = await getUserByEmail(profile.email)

          if (!existingUser) {
            // Create new user from Google profile
            await createUser({
              name: profile.name || (profile as Record<string, unknown>).given_name as string || profile.email.split('@')[0],
              email: profile.email,
              image: (profile as Record<string, unknown>).picture as string || '',
              provider: 'google',
              providerAccountId: account.providerAccountId || profile.sub || '',
            })
          } else if (existingUser.provider === 'credentials') {
            // Link Google account to existing credentials user
            await db.user.update({
              where: { id: existingUser.id },
              data: {
                providerAccountId: account.providerAccountId || profile.sub || '',
                image: (profile as Record<string, unknown>).picture as string || existingUser.image,
              },
            })
            // Also create an Account record for the OAuth link
            await db.account.upsert({
              where: {
                provider_providerAccountId: {
                  provider: 'google',
                  providerAccountId: account.providerAccountId || profile.sub || '',
                },
              },
              create: {
                userId: existingUser.id,
                providerType: 'oauth',
                provider: 'google',
                providerAccountId: account.providerAccountId || profile.sub || '',
                accessToken: account.access_token || '',
                refreshToken: account.refresh_token || '',
                expiresAt: account.expires_at,
                tokenType: account.token_type || '',
                scope: account.scope || '',
                idToken: account.id_token || '',
              },
              update: {
                accessToken: account.access_token || '',
                refreshToken: account.refresh_token || '',
                expiresAt: account.expires_at,
              },
            })
          }

          // Update last login
          const dbUser = await getUserByEmail(profile.email)
          if (dbUser) {
            await db.user.update({
              where: { id: dbUser.id },
              data: { lastLoginAt: new Date() },
            }).catch(() => { })
          }

          return true
        } catch (error) {
          console.error('Google sign-in error:', error)
          return false
        }
      }

      return true
    },

    // ===== JWT callback =====
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.userId = user.id
        token.role = (user as unknown as Record<string, unknown>).role as string || 'user'
        token.provider = (user as unknown as Record<string, unknown>).provider as string || account?.provider || 'credentials'
      }

      // Look up user from DB on subsequent requests to ensure role is fresh
      if (token.email) {
        const dbUser = await getUserByEmail(token.email as string)
        if (dbUser) {
          token.userId = dbUser.id
          token.role = dbUser.role
          token.provider = dbUser.provider
          token.picture = dbUser.image || token.picture
        }
      }

      return token
    },

    // ===== Session callback =====
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string
        session.user.role = token.role as string
        session.user.provider = token.provider as string
      }
      return session
    },
  },

  pages: {
    signIn: '/', // Use our custom login modal instead of default page
    error: '/',
  },

  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },

  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'goalzone-nextauth-secret-change-in-production',

  debug: process.env.NODE_ENV === 'development',
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

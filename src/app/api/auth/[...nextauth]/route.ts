import NextAuth from 'next-auth';
import GithubProvider from 'next-auth/providers/github';

const handler = NextAuth({
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      authorization: {
        params: {
          scope: 'repo read:org read:user',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Persist the OAuth access_token to the token right after sign in
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      // Send accessToken to the client so it can be used in API calls
      (session as any).accessToken = token.accessToken;
      return session;
    },
  },
  pages: {
    signIn: '/',  // Use our landing page for sign-in
  },
  secret: process.env.NEXTAUTH_SECRET || 'devmri-secret-change-in-production',
});

export { handler as GET, handler as POST };

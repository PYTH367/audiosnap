import { SignJWT } from "jose";
import GitHubProvider from "next-auth/providers/github";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account }) {
      if (account?.provider === "github") {
        token.sub = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      if (!token.sub) throw new Error("Authenticated session has no GitHub account id.");
      const secret = process.env.API_TOKEN_SECRET;
      if (!secret) throw new Error("API_TOKEN_SECRET is not configured.");

      session.user.id = token.sub;
      session.apiToken = await new SignJWT({})
        .setProtectedHeader({ alg: "HS256" })
        .setIssuer("audiosnap")
        .setAudience("audiosnap-api")
        .setSubject(token.sub)
        .setIssuedAt()
        .setExpirationTime("5m")
        .sign(new TextEncoder().encode(secret));

      return session;
    },
  },
};

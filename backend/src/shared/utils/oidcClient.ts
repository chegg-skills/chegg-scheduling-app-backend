import { Issuer, generators, type Client } from "openid-client";
import { logger } from "../logging/logger";

let cachedClient: Client | null = null;

export const getOidcClient = async (): Promise<Client> => {
  if (cachedClient) return cachedClient;

  const issuerUrl = process.env.OIDC_ISSUER_URL;
  const clientId = process.env.OIDC_CLIENT_ID;
  const clientSecret = process.env.OIDC_CLIENT_SECRET;
  const redirectUri = process.env.OIDC_REDIRECT_URI;

  if (!issuerUrl || !clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "SSO is not configured. Set OIDC_ISSUER_URL (e.g. https://yourorg.okta.com/oauth2/default), " +
        "OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, and OIDC_REDIRECT_URI.",
    );
  }

  const issuer = await Issuer.discover(issuerUrl);

  cachedClient = new issuer.Client({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uris: [redirectUri],
    response_types: ["code"],
  });

  logger.info("OIDC client initialized.", { issuer: issuer.issuer });

  return cachedClient;
};

export const buildAuthorizationUrl = async (state: string, nonce: string): Promise<string> => {
  const client = await getOidcClient();
  const redirectUri = process.env.OIDC_REDIRECT_URI!;

  return client.authorizationUrl({
    scope: "openid email profile",
    state,
    nonce,
    redirect_uri: redirectUri,
  });
};

export type OidcUserInfo = {
  sub: string;
  email: string;
  given_name?: string;
  family_name?: string;
  name?: string;
  picture?: string;
};

export const exchangeCodeForUserInfo = async (
  callbackParams: Record<string, string>,
  expectedState: string,
  expectedNonce: string,
): Promise<OidcUserInfo> => {
  const client = await getOidcClient();
  const redirectUri = process.env.OIDC_REDIRECT_URI!;

  const tokenSet = await client.callback(redirectUri, callbackParams, {
    state: expectedState,
    nonce: expectedNonce,
  });

  const claims = tokenSet.claims();

  const email = claims.email as string | undefined;
  if (!email) {
    throw new Error("OIDC provider did not return an email claim.");
  }

  return {
    sub: claims.sub,
    email,
    given_name: claims.given_name as string | undefined,
    family_name: claims.family_name as string | undefined,
    name: claims.name as string | undefined,
    picture: claims.picture as string | undefined,
  };
};

export const generateState = (): string => generators.state();
export const generateNonce = (): string => generators.nonce();

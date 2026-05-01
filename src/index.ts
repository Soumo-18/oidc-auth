import cors from "cors";
import crypto from "node:crypto";
import express from "express";
import path from "node:path";
import { eq } from "drizzle-orm";
import JWT from "jsonwebtoken";
import jose from "node-jose";
import { db } from "./db";
import { usersTable } from "./db/schema";
import { PRIVATE_KEY, PUBLIC_KEY } from "./utils/cert";
import type { JWTClaims } from "./utils/user-token";

import {  applicationsTable, authorizationCodesTable } from "./db/schema";
import { error } from "node:console";
import { PrimaryKey } from "drizzle-orm/gel-core";
import 'dotenv/config'
const app = express()
app.use(cors())
const PORT = process.env.PORT ?? 8000;

app.use(express.json());
app.use(express.static(path.resolve("public")));

app.get("/", (req, res) => res.json({ message: "Hello from Auth Server" }));

app.get("/health", (req, res) =>
  res.json({ message: "Server is healthy", healthy: true }),
);

//Admin Route Register a new application 
app.post('/admin/register-app', async (req,res)=> {
    const { name, url, redirectUri } = req.body 

    if(!name || !redirectUri) {
        return res
        .status(400)
        .json({ message: "App name and redirectUri are Required"})
    }

    const clientId = crypto.randomUUID()

    const clientSecret = crypto.randomBytes(32).toString("hex")

    await db.insert(applicationsTable).values({
        id:clientId,
        secret: clientSecret,
        name, 
        url,
        redirectUri
    })

    res.json({
        message:"Application Registered Successfully !",
        client_id: clientId,
        client_secret: clientSecret
    })
})






// OIDC Endpoints
app.get("/.well-known/openid-configuration", (req, res) => {
  const ISSUER = `http://localhost:${PORT}`;
  return res.json({
    issuer: ISSUER,
    authorization_endpoint: `${ISSUER}/o/authenticate`,
    userinfo_endpoint: `${ISSUER}/o/userinfo`,
    jwks_uri: `${ISSUER}/.well-known/jwks.json`,
  });
});

app.get("/.well-known/jwks.json", async (_, res) => {
  const key = await jose.JWK.asKey(PUBLIC_KEY, "pem");
  return res.json({ keys: [key.toJSON()] });
});

app.get("/o/authenticate", (req, res) => {
  return res.sendFile(path.resolve("public", "authenticate.html"));
});

// app.post("/o/authenticate/sign-in", async (req, res) => {
//   const { email, password } = req.body;

//   if (!email || !password) {
//     res.status(400).json({ message: "Email and password are required." });
//     return;
//   }

//   const [user] = await db
//     .select()
//     .from(usersTable)
//     .where(eq(usersTable.email, email))
//     .limit(1);

//   if (!user || !user.password || !user.salt) {
//     res.status(401).json({ message: "Invalid email or password." });
//     return;
//   }

//   const hash = crypto
//     .createHash("sha256")
//     .update(password + user.salt)
//     .digest("hex");

//   if (hash !== user.password) {
//     res.status(401).json({ message: "Invalid email or password." });
//     return;
//   }

//   const ISSUER = `http://localhost:${PORT}`;
//   const now = Math.floor(Date.now() / 1000);

//   const claims: JWTClaims = {
//     iss: ISSUER,
//     sub: user.id,
//     email: user.email,
//     email_verified: String(user.emailVerified),
//     exp: now + 3600,
//     given_name: user.firstName ?? "",
//     family_name: user.lastName ?? undefined,
//     name: [user.firstName, user.lastName].filter(Boolean).join(" "),
//     picture: user.profileImageURL ?? undefined,
//   };

//   const token = JWT.sign(claims, PRIVATE_KEY, { algorithm: "RS256" });

//   res.json({ token });
// });

app.post('/o/authenticate/sign-in', async(req,res) => {
    const { email, password, client_id, redirect_uri, state} = req.body

    if(!email || !password) {
        return res.status(400).
        json({ message:"Email and Password are Required"})
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1)

    if(!user || !user.password || !user.salt) {
        return res.status(401).json({
            message:" Invalid Email or Password"
        })
    }

    const hash = crypto.createHash("sha256").update( password + user.salt ).digest("hex")

    if( hash !== user.password) {
        return res.status(401).json({
            message:" Invalid Email or Password"
        })
    }

//Oauth 2.0 -> If Client_id is present the only issue the code

if(client_id && redirect_uri){
    const code  = crypto.randomBytes(16).toString("hex")

    //store the code in Database for 1min expiry
    await db.insert(authorizationCodesTable).values({
        code,
        clientId: client_id,
        userId: user.id,
        expiresAt: new Date( Date.now() + 60000 )
    })

    //redirect URL to the developer's app
    const redirectUrl = new URL(redirect_uri)
    redirectUrl.searchParams.set("code",code)

    if(state){
        redirectUrl.searchParams.set("state",state)
    }

    return res.json({ redirect : redirectUrl.toString() })

}

//direct login flow if no client_id

const ISSUER = `http://localhost:${PORT}`
const now = Math.floor( Date.now() / 1000 )

const claims: JWTClaims = {
    iss:ISSUER,
    sub:user.id,
    email:user.email,
    email_verified: String(user.emailVerified),
    exp: now + 3600,
    given_name:user.firstName ?? "",
    family_name:user.lastName ?? undefined,
    name:[user.firstName, user.lastName].filter(Boolean).join(' '),
    picture:user.profileImageURL ?? undefined
}

const token = JWT.sign(claims, PRIVATE_KEY, { algorithm: "RS256"})
res.json({ token })

})

//token exchange endpoint
app.post('/o/token', async(req,res) => {
    const { grant_type, code, client_id, client_secret}= req.body

    //validation the applications credentials
    const [app] = await db.select().from(applicationsTable).where(eq(applicationsTable.id, client_id)).limit(1)

    if(!app || app.secret !== client_secret){
        return res.status(401).json({error:"Invalid_client"})
    }
    //validating the authorization code 
    const [authCode] = await db.select().from(authorizationCodesTable).where(eq(authorizationCodesTable.code, code)).limit(1)

    if(!authCode || authCode.clientId !== client_id) { 
        return res.status(400).json({
            error:"invalid_grant", message:"Invlaid Code"
        })
    }

    if(new Date() > authCode.expiresAt ) {
        return res.status(400).json({error:"invalid_grant", message:"Code Expired"})
    }

    //delete the code so it cannot be used again
    await db.delete(authorizationCodesTable).where(eq(authorizationCodesTable.id, authCode.id))

    //get the User and Issue Token
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, authCode.userId)).limit(1)

    const ISSUER = `http://localhost:${PORT}`
    const now = Math.floor( Date.now() / 1000 )

    const claims: JWTClaims = {
        iss:ISSUER,
        sub:user.id,
        email:user.email,
        email_verified:String(user.emailVerified),
        exp:now+3600,
        given_name:user.firstName ?? "",
        family_name: user.lastName ?? undefined,
        name: [user.firstName, user.lastName].filter(Boolean).join(' '),
        picture: user.profileImageURL ?? undefined

    }

    const id_token = JWT.sign(claims, PRIVATE_KEY, { algorithm: "RS256"})

    //in OIDC we return an access_token for (APIs) and an id_token(user profile data)
    res.json({
        access_token:id_token,
        id_token: id_token,
        token_type:"Bearer",
        expires_in:3600
    })
})




app.post("/o/authenticate/sign-up", async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  if (!email || !password || !firstName) {
    res
      .status(400)
      .json({ message: "First name, email, and password are required." });
    return;
  }

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (existing) {
    res
      .status(409)
      .json({ message: "An account with this email already exists." });
    return;
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .createHash("sha256")
    .update(password + salt)
    .digest("hex");

  await db.insert(usersTable).values({
    firstName,
    lastName: lastName ?? null,
    email,
    password: hash,
    salt,
  });

  res.status(201).json({ ok: true });
});

app.get("/o/userinfo", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res
      .status(401)
      .json({ message: "Missing or invalid Authorization header." });
    return;
  }

  const token = authHeader.slice(7);

  let claims: JWTClaims;
  try {
    claims = JWT.verify(token, PUBLIC_KEY, {
      algorithms: ["RS256"],
    }) as JWTClaims;
  } catch {
    res.status(401).json({ message: "Invalid or expired token." });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, claims.sub))
    .limit(1);

  if (!user) {
    res.status(404).json({ message: "User not found." });
    return;
  }

  res.json({
    sub: user.id,
    email: user.email,
    email_verified: user.emailVerified,
    given_name: user.firstName,
    family_name: user.lastName,
    name: [user.firstName, user.lastName].filter(Boolean).join(" "),
    picture: user.profileImageURL,
  });
});

app.listen(PORT, () => {
  console.log(`AuthServer is running on PORT ${PORT}`);
});
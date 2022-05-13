import jwt from "jsonwebtoken";
import { PRIVATE_KEY, PUBLIC_KEY } from "@app/config/config";

const issuer = "AUTH/RESOURCE";
const expiresIn = "365 days";
const algorithm = "RS256";

const subject = "user@.com";
const audience = "http://adahelpalerts.com";
const keyid = "";

const signOptions = {
  issuer,
  subject,
  audience,
  expiresIn,
  algorithm,
  keyid,
};

let privateKey = String(PRIVATE_KEY).trim();
let publicKey = String(PUBLIC_KEY).trim();

export function signJwt({ email, role, keyid }, options = {}) {
  return jwt.sign(
    {
      subject: email,
      // TODO: audience should be domain -> move role to another prop or combine with subject
      audience: role,
      keyid,
    },
    privateKey,
    Object.assign({}, signOptions, options) as any
  );
}

export function verifyJwt(token, options = {}) {
  return jwt.verify(
    token,
    publicKey,
    Object.assign({}, signOptions, options, { algorithm: [algorithm] })
  );
}

export function decodeJwt(token) {
  return token && jwt.decode(token, { complete: true });
}

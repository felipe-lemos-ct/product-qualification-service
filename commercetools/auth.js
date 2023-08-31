import { encode } from "js-base64";
import fetch from "node-fetch";
import { createGroup, createPromiseSessionCache } from "./group.js";
//import dotenv from "dotenv";
//dotenv.config();

const config = {
  projectKey: process.env.CTP_PROJECT_KEY,
  clientId: process.env.CTP_CLIENT_ID,
  clientSecret: process.env.CTP_CLIENT_SECRET,
  scope: process.env.CTP_SCOPES,
  authHost: process.env.CTP_AUTH_URL,
  apiHost: process.env.CTP_API_URL,
};

const createAuth = (au) => encode(`${au.id}:${au.secret}`);
const au = {
  id: config.clientId,
  secret: config.clientSecret,
  scope: config.scope,
  projectKey: config.projectKey,
  authHost: config.authHost,
};
let token = null;
let rToken = null;
const saveToken = ({ access_token, refresh_token }) => {
  if (access_token) {
    token = access_token;
  }
  if (refresh_token) {
    rToken = refresh_token;
  }
  return access_token;
};
export const resetToken = () => {
  token = null;
  rToken = null;
};
const group = createGroup(createPromiseSessionCache());
const getToken = group(() => {
  if (token) {
    return Promise.resolve(token);
  }
  const scope = encodeURI(au.scope);
  const auth = createAuth(au);
  return fetch(`${au.authHost}/oauth/${au.projectKey}/anonymous/token`, {
    headers: {
      authorization: `Basic ${auth}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=client_credentials&scope=${scope}`,
    method: "POST",
  })
    .then((response) =>
      response.ok ? response.json() : Promise.reject(response)
    )
    .then(saveToken);
});
export const fetchCt = (url, options = {}) => {
  try {
    return getToken().then((token) => {
      return fetch(`${config.apiHost}/${config.projectKey}/${url}`, {
        ...options,
        headers: {
          authorization: `Bearer ${token}`,
        },
      }).then(
        (response) => {
          if (response.status === 401) {
            return refreshToken({
              id: config.clientId,
              secret: config.clientSecret,
              scope: config.scope,
              projectKey: config.projectKey,
              authHost: config.authHost,
            }).then(() => {
              return fetchWithToken(url, options);
            });
          }
          return response;
        },
        (error) => {
          resetToken();
          return Promise.reject(error);
        }
      );
    });
  } catch (err) {
    console.log(err);
  }
};
const refreshToken = group((au) => {
  const auth = createAuth(au);
  if (!rToken) {
    resetToken();
    return Promise.reject("no refresh token");
  }
  return fetch(`${au.authHost}/oauth/token`, {
    headers: {
      authorization: `Basic ${auth}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=refresh_token&refresh_token=${rToken}`,
    method: "POST",
  })
    .then((response) => response.json())
    .then((token) => {
      if (token?.error) {
        resetToken();
        return Promise.reject(token.error);
      }
      saveToken(token);
    });
});
//login, logout probably not used on the server
export const loginToken = (email, password) => {
  const auth = createAuth(au);
  return fetch(`${au.authHost}/oauth/${au.projectKey}/customers/token`, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      authorization: `Basic ${auth}`,
    },
    body: new URLSearchParams({
      username: email,
      password,
      grant_type: "password",
      scope: config.scope,
    }),
    method: "POST",
  })
    .then((response) => response.json())
    .then((response) => {
      saveToken(response);
    });
};
export const logout = () => {
  resetToken();
  localStorage.removeItem(CUSTOMER);
};

export default fetchCt;

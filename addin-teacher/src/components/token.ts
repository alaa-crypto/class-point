// src/token.ts
export let accessToken: string | null = null;

export const setAccessToken = (token: string) => {
  accessToken = token;
};

import axios from 'axios';

export async function getGitHubOIDCToken(audience = 'your-service') {
  const requestUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL + `&audience=${audience}`;
  const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;

  if (!requestUrl || !requestToken) {
    throw new Error('Missing ACTIONS_ID_TOKEN_REQUEST_URL or TOKEN');
  }

  const response = await axios.get<{ value: string }>(requestUrl, {
    headers: {
      Authorization: `Bearer ${requestToken}`
    }
  });

  return response.data.value;
}

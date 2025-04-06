import axios from 'axios';
import { getGitHubOIDCToken } from './auth';

interface EventPayload {
  repo_name: string;
  timestamp: string;
  data: {
    onchain_data: {
      transactionVolume: string;
      contractInteractions: number;
      uniqueWallets: number;
    } | null;
    offchain_data: any;
  };
}

function convertFloatsToDecimalStrings(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'number' && !Number.isInteger(obj)) {
    return obj.toFixed(6);
  }
  
  if (typeof obj === 'object') {
    if (Array.isArray(obj)) {
      return obj.map(item => convertFloatsToDecimalStrings(item));
    }
    
    const result: any = {};
    for (const key in obj) {
      result[key] = convertFloatsToDecimalStrings(obj[key]);
    }
    return result;
  }
  
  return obj;
}

export async function sendEventToAWS(payload: EventPayload) {
  const apiUrl = 'https://near-protocol-rewards-tracking.com/event';

  try {
    const processedPayload = convertFloatsToDecimalStrings(payload);
    const jwtToken = await getGitHubOIDCToken('near-protocol-rewards-tracking');
    
    const response = await axios.post(apiUrl, processedPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      }
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Request error: ${error.response?.status} - ${error.response?.data}`);
    }
    throw new Error(`Error sending event: ${error instanceof Error ? error.message : String(error)}`);
  }
} 
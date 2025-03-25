import fetch from 'node-fetch';

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
  if (!process.env.EVENT_API_KEY || !process.env.EVENT_API_URL) {
    throw new Error('EVENT_API_KEY and EVENT_API_URL are required to send events');
  }

  try {
    const processedPayload = convertFloatsToDecimalStrings(payload);
    
    const response = await fetch(process.env.EVENT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EVENT_API_KEY}`
      },
      body: JSON.stringify(processedPayload)
    });

    if (!response.ok) {
      throw new Error(`Request error: ${response.status} - ${await response.text()}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Error sending event: ${error instanceof Error ? error.message : String(error)}`);
  }
} 
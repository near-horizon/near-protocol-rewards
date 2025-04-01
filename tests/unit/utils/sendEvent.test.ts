import axios from 'axios';
import { sendEventToAWS } from '../../../src/utils/sendEvent';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('sendEventToAWS', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      ACTIONS_ID_TOKEN_REQUEST_URL: 'https://token.actions.githubusercontent.com',
      ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'test-token'
    };
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should successfully send event with integer values', async () => {
    const mockResponse = { success: true };
    mockedAxios.get.mockResolvedValueOnce({ data: { value: 'test-jwt-token' } });
    mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

    const payload = {
      repo_name: 'test-repo',
      timestamp: '2024-03-20T00:00:00Z',
      data: {
        onchain_data: {
          transactionVolume: '100',
          contractInteractions: 50,
          uniqueWallets: 25
        },
        offchain_data: {
          commits: 10,
          prs: 5
        }
      }
    };

    const result = await sendEventToAWS(payload);
    expect(result).toEqual(mockResponse);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://near-protocol-rewards-tracking.com/prod/event',
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-jwt-token'
        }
      }
    );
  });

  it('should convert float values to decimal strings', async () => {
    const mockResponse = { success: true };
    mockedAxios.get.mockResolvedValueOnce({ data: { value: 'test-jwt-token' } });
    mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

    const payload = {
      repo_name: 'test-repo',
      timestamp: '2024-03-20T00:00:00Z',
      data: {
        onchain_data: {
          transactionVolume: '100.123456789',
          contractInteractions: 50.5,
          uniqueWallets: 25
        },
        offchain_data: {
          score: 4.123456789,
          metrics: [1.23456789, 2.3456789]
        }
      }
    };

    await sendEventToAWS(payload);

    const expectedPayload = {
      repo_name: 'test-repo',
      timestamp: '2024-03-20T00:00:00Z',
      data: {
        onchain_data: {
          transactionVolume: '100.123456789',
          contractInteractions: '50.500000',
          uniqueWallets: 25
        },
        offchain_data: {
          score: '4.123457',
          metrics: ['1.234568', '2.345679']
        }
      }
    };

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://near-protocol-rewards-tracking.com/prod/event',
      expectedPayload,
      expect.any(Object)
    );
  });

  it('should handle null and undefined values', async () => {
    const mockResponse = { success: true };
    mockedAxios.get.mockResolvedValueOnce({ data: { value: 'test-jwt-token' } });
    mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

    const payload = {
      repo_name: 'test-repo',
      timestamp: '2024-03-20T00:00:00Z',
      data: {
        onchain_data: null,
        offchain_data: {
          value1: null,
          value2: undefined
        }
      }
    };

    await sendEventToAWS(payload);

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://near-protocol-rewards-tracking.com/prod/event',
      payload,
      expect.any(Object)
    );
  });

  it('should throw error when GitHub Actions environment variables are missing', async () => {
    delete process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
    delete process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;

    const payload = {
      repo_name: 'test-repo',
      timestamp: '2024-03-20T00:00:00Z',
      data: {
        onchain_data: null,
        offchain_data: {}
      }
    };

    await expect(sendEventToAWS(payload)).rejects.toThrow(
      'Missing ACTIONS_ID_TOKEN_REQUEST_URL or TOKEN'
    );
  });

  it('should handle axios error with response', async () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 400,
        data: 'Bad Request'
      }
    };
    
    mockedAxios.isAxiosError.mockReturnValueOnce(true);
    mockedAxios.get.mockResolvedValueOnce({ data: { value: 'test-jwt-token' } });
    mockedAxios.post.mockRejectedValueOnce(error);

    const payload = {
      repo_name: 'test-repo',
      timestamp: '2024-03-20T00:00:00Z',
      data: {
        onchain_data: null,
        offchain_data: {}
      }
    };

    await expect(sendEventToAWS(payload)).rejects.toThrow(
      'Request error: 400 - Bad Request'
    );
  });

  it('should handle generic error', async () => {
    const error = new Error('Network error');
    mockedAxios.isAxiosError.mockReturnValueOnce(false);
    mockedAxios.get.mockResolvedValueOnce({ data: { value: 'test-jwt-token' } });
    mockedAxios.post.mockRejectedValueOnce(error);

    const payload = {
      repo_name: 'test-repo',
      timestamp: '2024-03-20T00:00:00Z',
      data: {
        onchain_data: null,
        offchain_data: {}
      }
    };

    await expect(sendEventToAWS(payload)).rejects.toThrow(
      'Error sending event: Network error'
    );
  });
}); 
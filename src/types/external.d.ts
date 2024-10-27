declare module 'near-api-js' {
  export interface Account {
    getTransactions(): Promise<any>;
    viewFunction(contractId: string, method: string, args?: any): Promise<any>;
  }
}

declare module '@nearblocks/api' {
  export interface TransactionResponse {
    transactions: Array<{
      hash: string;
      signer_id: string;
      receiver_id: string;
      block_timestamp: string;
      actions: Array<{
        action_kind: string;
        args: Record<string, any>;
      }>;
    }>;
  }
}

import { ICollector, ICollectorResult } from "./base";
import { connect, keyStores, Near } from "near-api-js";
import axios from "axios";

export class WalletCollector implements ICollector {
  name = "walletCollector";

  async collect(walletId: string): Promise<ICollectorResult> {
    if (!walletId.endsWith(".near")) {
      throw new Error("Invalid NEAR wallet ID");
    }

    console.log(`🔍 Coletando métricas da carteira: ${walletId}...`);

    const near = new Near({
      networkId: "mainnet",
      nodeUrl: "https://rpc.mainnet.near.org",
      keyStore: new keyStores.InMemoryKeyStore(),
    });

    const endpoint = `https://api.nearblocks.io/v1/account/${walletId}/transactions`;

    try {
      const response = await axios.get(endpoint);
      const transactions = response.data.transactions || [];

      const metrics = {
        totalTransactions: transactions.length,
        totalGasUsed: transactions.reduce((acc: number, tx: any) => acc + parseInt(tx.gas_used || "0"), 0),
        totalDeposit: transactions.reduce((acc: number, tx: any) => acc + parseFloat(tx.deposit || "0"), 0),
        recentTransactions: transactions.slice(0, 5),
      };

      return {
        success: true,
        data: metrics,
      };
    } catch (error) {
      console.error("❌ Erro ao coletar métricas:", error);
      return {
        success: false,
        error: (error as any).message,
      };
    }
  }
}

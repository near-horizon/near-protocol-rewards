import { WalletCollector } from "./wallet"; // Ajuste o caminho se necessário

async function testWalletCollector() {
  const walletCollector = new WalletCollector();
  const testWalletId = "pinnacle1.near"; // Substitua por uma wallet válida para um teste real

  try {
    const result = await walletCollector.collect(testWalletId);

    if (result.success) {
      console.log("✅ Coleta bem-sucedida! Métricas da carteira:");
      console.log(result.data);
    } else {
      console.error("❌ Erro na coleta:", result.error);
    }
  } catch (error) {
    console.error("❌ Erro inesperado:", error);
  }
}

testWalletCollector();

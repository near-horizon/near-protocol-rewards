import { getTransactionsForUserInPeriod, getLastMonthPeriod } from "./near-index";

async function main() {
  const accountId = "near"; // Substitua pela conta desejada
  const network: "mainnet" | "testnet" = "testnet"; // Altere para "testnet" se preferir

  // Obtém o período do último mês em nanosegundos
  const [startTimestamp, endTimestamp] = getLastMonthPeriod();

  console.log(`Consultando transações para a conta ${accountId} na rede ${network}`);
  console.log(`Período: ${startTimestamp} até ${endTimestamp}`);

  try {
    const transactions = await getTransactionsForUserInPeriod(
      accountId,
      startTimestamp,
      endTimestamp,
      network
    );
    console.log(`Transações encontradas para ${accountId} no período:`);
    console.log(transactions);
  } catch (error) {
    console.error("Erro ao obter transações:", error);
  }
}

main();

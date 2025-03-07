import { Client } from "pg";

export interface Transaction {
  transaction_hash: string;
  signer_id: string;
  receiver_id: string;
  block_timestamp: number;
  // Add other columns as needed according to the database schema
}

/**
 * Calculates the period of the last month.
 * Returns an array [startTimestamp, endTimestamp] in nanoseconds.
 *
 * For example, if today is April 15, the period will be from March 1 (00:00:00) to April 1 (00:00:00).
 */
export function getLastMonthPeriod(): [number, number] {
  const now = new Date();
  // First day of the current month (00:00:00)
  const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Calculate the first day of the previous month
  let lastMonth = firstDayCurrentMonth.getMonth() - 1;
  let lastMonthYear = firstDayCurrentMonth.getFullYear();
  if (lastMonth < 0) {
    lastMonth = 11;
    lastMonthYear--;
  }
  const firstDayLastMonth = new Date(lastMonthYear, lastMonth, 1);

  // Get timestamps in milliseconds
  const startTimestampMs = firstDayLastMonth.getTime();
  const endTimestampMs = firstDayCurrentMonth.getTime();

  // Convert to nanoseconds (milliseconds * 1e6)
  const startTimestampNs = startTimestampMs * 1e6;
  const endTimestampNs = endTimestampMs * 1e6;

  return [startTimestampNs, endTimestampNs];
}

/**
 * Retrieves the transactions for a user (account) in the specified period using the near-indexer database.
 *
 * @param accountId - The account identifier (e.g., "near")
 * @param startTimestamp - Start of the period (in nanoseconds)
 * @param endTimestamp - End of the period (in nanoseconds)
 * @param network - Defines which network to query ("mainnet" or "testnet")
 * @returns A list of transactions involving the account, ordered by timestamp
 */
export async function getTransactionsForUserInPeriod(
  accountId: string,
  startTimestamp: number,
  endTimestamp: number,
  network: "mainnet" | "testnet" = "testnet"
): Promise<Transaction[]> {
  // Connection credentials for each network
  const connectionStringMainnet =
    "postgres://public_readonly:nearprotocol@mainnet.db.explorer.indexer.near.dev/mainnet_explorer";
  const connectionStringTestnet =
    "postgres://public_readonly:nearprotocol@testnet.db.explorer.indexer.near.dev/testnet_explorer";

  const connectionString =
    network === "mainnet" ? connectionStringMainnet : connectionStringTestnet;

  const client = new Client({ connectionString });

  await client.connect();

  const query = `
    SELECT transaction_hash, signer_id, receiver_id, block_timestamp
    FROM transactions
    WHERE (signer_id = $1 OR receiver_id = $1)
      AND block_timestamp BETWEEN $2 AND $3
    ORDER BY block_timestamp ASC
  `;
  const values = [accountId, startTimestamp, endTimestamp];

  try {
    const res = await client.query(query, values);
    return res.rows as Transaction[];
  } catch (error) {
    console.error("Error querying the database:", error);
    throw error;
  } finally {
    await client.end();
  }
}
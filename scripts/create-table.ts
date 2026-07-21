/**
 * Creates the local DynamoDB table. Safe to re-run.
 * Usage: DDB_ENDPOINT=http://localhost:8000 npm run create-table
 */
import {
  CreateTableCommand,
  DynamoDBClient,
  ListTablesCommand,
  ResourceInUseException,
  UpdateTimeToLiveCommand,
} from "@aws-sdk/client-dynamodb";

const TableName = process.env.TABLE_NAME ?? "WhoOwesWhat";
const endpoint = process.env.DDB_ENDPOINT ?? "http://localhost:8000";

const client = new DynamoDBClient({
  endpoint,
  region: process.env.AWS_REGION ?? "us-east-1",
  credentials: { accessKeyId: "local", secretAccessKey: "local" },
});

/** DynamoDB Local takes a few seconds to bind its port after the container starts. */
async function waitForDynamo(timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      await client.send(new ListTablesCommand({}));
      return;
    } catch (error) {
      if (Date.now() > deadline) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

await waitForDynamo();

try {
  await client.send(
    new CreateTableCommand({
      TableName,
      BillingMode: "PAY_PER_REQUEST",
      AttributeDefinitions: [
        { AttributeName: "pk", AttributeType: "S" },
        { AttributeName: "sk", AttributeType: "S" },
      ],
      KeySchema: [
        { AttributeName: "pk", KeyType: "HASH" },
        { AttributeName: "sk", KeyType: "RANGE" },
      ],
    }),
  );
  await client.send(
    new UpdateTimeToLiveCommand({
      TableName,
      TimeToLiveSpecification: { AttributeName: "ttl", Enabled: true },
    }),
  );
  console.log(`Created ${TableName} at ${endpoint}`);
} catch (error) {
  if (error instanceof ResourceInUseException) {
    console.log(`${TableName} already exists at ${endpoint}`);
  } else {
    throw error;
  }
}

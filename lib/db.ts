import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { EventDoc } from "./types";

export const TABLE_NAME = process.env.TABLE_NAME ?? "WhoOwesWhat";

/** Two years of inactivity before an event expires. */
const TTL_SECONDS = 60 * 60 * 24 * 365 * 2;

let client: DynamoDBDocumentClient | null = null;

function db(): DynamoDBDocumentClient {
  if (client) return client;
  // DDB_ENDPOINT points at DynamoDB Local under docker compose; unset in AWS.
  const endpoint = process.env.DDB_ENDPOINT;
  const base = new DynamoDBClient({
    ...(endpoint ? { endpoint } : {}),
    ...(endpoint
      ? {
          region: process.env.AWS_REGION ?? "us-east-1",
          credentials: { accessKeyId: "local", secretAccessKey: "local" },
        }
      : {}),
  });
  client = DynamoDBDocumentClient.from(base, {
    marshallOptions: { removeUndefinedValues: true },
  });
  return client;
}

export type StoredEvent = {
  doc: EventDoc;
  updatedAt: string;
  passphrase?: { salt: string; hash: string };
};

const key = (id: string) => ({ pk: `EVENT#${id}`, sk: "DOC" });
const ttl = () => Math.floor(Date.now() / 1000) + TTL_SECONDS;

export async function getEvent(id: string): Promise<StoredEvent | null> {
  const res = await db().send(new GetCommand({ TableName: TABLE_NAME, Key: key(id) }));
  if (!res.Item) return null;
  return {
    doc: res.Item.doc as EventDoc,
    updatedAt: res.Item.updatedAt as string,
    passphrase: res.Item.passphrase as StoredEvent["passphrase"],
  };
}

export async function createEvent(
  doc: EventDoc,
  passphrase?: { salt: string; hash: string },
): Promise<void> {
  await db().send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { ...key(doc.id), doc, passphrase, updatedAt: new Date().toISOString(), ttl: ttl() },
      ConditionExpression: "attribute_not_exists(pk)",
    }),
  );
}

/**
 * Last write wins by design: the doc is replaced wholesale, and the passphrase
 * attribute is left untouched so a save can't drop it.
 */
export async function putEventDoc(doc: EventDoc): Promise<string> {
  const updatedAt = new Date().toISOString();
  await db().send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: key(doc.id),
      UpdateExpression: "SET #doc = :doc, updatedAt = :updatedAt, #ttl = :ttl",
      ConditionExpression: "attribute_exists(pk)",
      ExpressionAttributeNames: { "#doc": "doc", "#ttl": "ttl" },
      ExpressionAttributeValues: { ":doc": doc, ":updatedAt": updatedAt, ":ttl": ttl() },
    }),
  );
  return updatedAt;
}

/**
 * Counts failed unlock attempts in a short window. Returns the running count
 * so the caller can lock the event out before a passphrase can be guessed.
 */
export async function bumpUnlockAttempts(id: string, windowSeconds = 900): Promise<number> {
  const res = await db().send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { pk: `EVENT#${id}`, sk: "UNLOCK_ATTEMPTS" },
      UpdateExpression: "ADD attempts :one SET #ttl = if_not_exists(#ttl, :ttl)",
      ExpressionAttributeNames: { "#ttl": "ttl" },
      ExpressionAttributeValues: {
        ":one": 1,
        ":ttl": Math.floor(Date.now() / 1000) + windowSeconds,
      },
      ReturnValues: "UPDATED_NEW",
    }),
  );
  return (res.Attributes?.attempts as number) ?? 1;
}

export async function getUnlockAttempts(id: string): Promise<number> {
  const res = await db().send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: `EVENT#${id}`, sk: "UNLOCK_ATTEMPTS" },
    }),
  );
  const item = res.Item;
  if (!item) return 0;
  // DynamoDB Local doesn't sweep expired items promptly; check ttl ourselves.
  if (typeof item.ttl === "number" && item.ttl < Date.now() / 1000) return 0;
  return (item.attempts as number) ?? 0;
}

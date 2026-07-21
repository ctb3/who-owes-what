# Who Owes What

Split expenses with friends. No accounts: each **event** lives at its own secret URL, with an
optional passphrase.

- Add people to an event, then log expenses — who paid, and who it's split between (everyone by
  default, or a subset, weighted shares, or exact amounts).
- Mark two people as a **couple**. They still pay two full shares, but they settle up as one unit
  and never owe each other.
- The Balances tab lists who pays who, using the fewest possible payments.

## Running locally

```sh
docker compose up
```

App on http://localhost:3000, DynamoDB Local on :8000. This builds the same image that gets
deployed, so a pass here means something.

Without Docker, against DynamoDB Local started separately:

```sh
cp .env.example .env.local
npm ci
npm run create-table
npm run dev
```

## Checks

```sh
npm test        # split, balance, settlement, auth, and schema logic
npm run typecheck
npm run lint
```

## How it fits together

One Next.js app, `output: 'standalone'`, packaged as a single container image. That image runs
under `docker run`, under Lambda via the [AWS Lambda Web
Adapter](https://github.com/awslabs/aws-lambda-web-adapter), or on ECS — no framework-specific
deploy adapter involved.

| Path | What it holds |
| --- | --- |
| `lib/money.ts` | Integer-cent splitting. Remainder cents are distributed, never dropped. |
| `lib/parties.ts` | Groups people into settlement units — this is where couples merge. |
| `lib/balances.ts` | Per-person and per-party balances, adjusted by recorded settle-ups. |
| `lib/settle.ts` | Greedy creditor/debtor matching for the fewest transfers. |
| `app/api/events/**` | Create, read, replace. Writes are last-write-wins on a whole document. |
| `infra/` | Terraform: DynamoDB, Lambda (container), CloudFront. |
| `infra/bootstrap/` | Applied once: state bucket, ECR, GitHub OIDC deploy role. |

Storage is one DynamoDB item per event (`pk = EVENT#<id>`, `sk = DOC`) holding the whole
document. That's what makes last-write-wins coherent: there are no partial saves to reconcile.

## Deploying

First time only:

```sh
AWS_PROFILE=ctb3-general-admin terraform -chdir=infra/bootstrap init
AWS_PROFILE=ctb3-general-admin terraform -chdir=infra/bootstrap apply
```

Then set the `AWS_DEPLOY_ROLE` repository variable in GitHub to the `deploy_role_arn` output.
After that, pushes to `main` build the image, push it to ECR, and `terraform apply` the stack via
GitHub Actions with no long-lived AWS keys.

To deploy by hand:

```sh
AWS_PROFILE=ctb3-general-admin aws ecr get-login-password --region us-east-2 \
  | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-2.amazonaws.com
docker build -t <ecr-url>:local . && docker push <ecr-url>:local
AWS_PROFILE=ctb3-general-admin terraform -chdir=infra apply -var="image_digest=sha256:…"
```

## Security notes

- The event URL is the only credential by default. Anyone with it can read and edit.
- A passphrase, if set, is stored scrypt-hashed with a per-event salt. Unlocking sets an
  HMAC-signed, HttpOnly cookie scoped to that one event; failed attempts are rate limited.

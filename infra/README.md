# Immivo Infrastructure

This directory contains the **AWS CDK (Cloud Development Kit)** code that defines the entire cloud infrastructure for Immivo AI.

## 🏗 Stack Overview

The stack (`lib/infra-stack.ts`) provisions the following resources:

1.  **VPC (Network):** Public & Private subnets with NAT Gateway (both Test and Prod).
2.  **Database (RDS):**
    - **Test:** PostgreSQL `t4g.micro` instance (private subnet, `RETAIN`).
    - **Prod:** Aurora Serverless v2 (PostgreSQL compatible, private subnet).
3.  **Authentication:** AWS Cognito User Pool (Users) + Admin User Pool (Platform Admins).
4.  **Backend API:** AWS Lambda (Node.js, in VPC) + API Gateway + **Orchestrator Function URL** (BUFFERED, 15min Timeout für `/chat/stream`).
5.  **Email Ingest:** S3 Bucket + Lambda Trigger (Email Parser).
6.  **Media Storage:** S3 Bucket (Property images, floorplans, bug report screenshots).
7.  **Frontend:** AWS Lambda (Docker) with Function URL.

## 🚀 Deployment

We use **GitHub Actions** for CI/CD (`.github/workflows/deploy.yml`).

### Automatic Deployment
- Pushing to `test` → deploys **Test** (`Immivo-Test`)
- Pushing to `main` → deploys **Prod** (`Immivo-Prod`) *(requires manual approval)*

### Manual Deployment
- You can manually trigger a deployment to **Test** or **Prod** via the GitHub Actions "Run workflow" button.

### Custom Domains
- **Test:** `test.immivo.ai` (Frontend), `test-api.immivo.ai` (API), `test-media.immivo.ai` (Media)
- **Prod:** `app.immivo.ai` / `immivo.ai` (Frontend), `api.immivo.ai` (API), `admin.immivo.ai` (Admin), `media.immivo.ai` (Media)

## 🛠 Local Development

### Prerequisites
- AWS CLI configured
- Node.js 20+
- CDK CLI (`npm install -g aws-cdk`)

### Useful Commands

*   `npm run build`   compile typescript to js
*   `npm run watch`   watch for changes and compile
*   `cdk deploy`      deploy this stack to your default AWS account/region
*   `cdk diff`        compare deployed stack with current state
*   `cdk synth`       emits the synthesized CloudFormation template

### Workflow

```
Lokal entwickeln → push test → (approve) → push main (Prod)
```

Shortcut via Shell-Alias:
```bash
push test "mein feature"   # commit + push auf test branch
push main                  # test → main mergen + pushen
```

# Immivo Infrastructure

This directory contains the **AWS CDK (Cloud Development Kit)** code that defines the entire cloud infrastructure for Immivo AI.

## 🏗 Stack Overview

The stack (`lib/infra-stack.ts`) provisions the following resources:

1.  **VPC (Network):**
    - **Dev:** Public subnets only (cheaper, no NAT Gateway needed).
    - **Stage/Prod:** Public & Private subnets with NAT Gateway for security.
2.  **Database (RDS):**
    - **Dev:** PostgreSQL `t4g.micro` instance.
    - **Prod:** Aurora Serverless v2 (PostgreSQL compatible).
3.  **Authentication:** AWS Cognito User Pool & Client.
4.  **Backend API:** AWS Lambda (Node.js) + API Gateway.
5.  **Email Ingest:** S3 Bucket + Lambda Trigger (Email Parser).
6.  **Frontend:** AWS Lambda (Docker) with Function URL.

## 🚀 Deployment

We use **GitHub Actions** for CI/CD (`.github/workflows/deploy.yml`).

### Automatic Deployment
- Pushing to the `main` branch automatically deploys to the **Dev** environment (`Immivo-Dev`).

### Manual Deployment
- You can manually trigger a deployment to **Stage** or **Prod** via the GitHub Actions "Run workflow" button.

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

### Cost Management (Dev)
To keep costs low in the Dev environment:
- **RDS:** We use a single `t4g.micro` instance (~$15/month).
- **Frontend:** We use Lambda (Scale to Zero).
- **NAT Gateway:** Disabled in Dev (saves ~$30/month).

**Total estimated Dev cost:** ~$15-20 / month.

# Infrastructure (AWS CDK)

This directory contains the Infrastructure as Code (IaC) definitions for the NeuroConcepts platform.

## Environments

We use a multi-stage deployment strategy:

1.  **Dev** (`NeuroConcepts-Dev`): For development and testing.
2.  **Stage** (`NeuroConcepts-Stage`): Pre-production mirror.
3.  **Prod** (`NeuroConcepts-Prod`): Live production environment.

## Deployment

### Prerequisites
*   AWS CLI configured (`aws configure`)
*   Node.js & NPM installed

### Commands

```bash
# Install dependencies
npm install

# Deploy Dev environment
npx cdk deploy NeuroConcepts-Dev

# Deploy Stage environment
npx cdk deploy NeuroConcepts-Stage

# Deploy Prod environment (Careful!)
npx cdk deploy NeuroConcepts-Prod
```

## Structure

*   `bin/infra.ts`: Entry point. Defines the 3 environments.
*   `lib/infra-stack.ts`: The actual infrastructure definition (VPC, DB, Fargate, etc.).

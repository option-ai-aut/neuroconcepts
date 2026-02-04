#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ImmivoStack } from '../lib/infra-stack';

const app = new cdk.App();

const defaultEnv = { 
  account: process.env.CDK_DEFAULT_ACCOUNT, 
  region: 'eu-central-1' 
};

// 1. Dev Environment (For developers)
new ImmivoStack(app, 'Immivo-Dev', {
  env: defaultEnv,
  stageName: 'dev',
  description: 'Development environment for Immivo AI',
});

// 2. Stage Environment (Pre-production mirror)
new ImmivoStack(app, 'Immivo-Stage', {
  env: defaultEnv,
  stageName: 'stage',
  description: 'Staging environment for final testing',
});

// 3. Prod Environment (Live)
new ImmivoStack(app, 'Immivo-Prod', {
  env: defaultEnv,
  stageName: 'prod',
  description: 'Production environment for Immivo AI',
});

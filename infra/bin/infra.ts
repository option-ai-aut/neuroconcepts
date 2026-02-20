#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ImmivoStack } from '../lib/infra-stack';

const app = new cdk.App();

const defaultEnv = { 
  account: process.env.CDK_DEFAULT_ACCOUNT, 
  region: 'eu-central-1' 
};

// 1. Test Environment (Pre-production testing)
new ImmivoStack(app, 'Immivo-Test', {
  env: defaultEnv,
  stageName: 'test',
  description: 'Testing environment for QA',
});

// 2. Prod Environment (Live)
new ImmivoStack(app, 'Immivo-Prod', {
  env: defaultEnv,
  stageName: 'prod',
  description: 'Production environment for Immivo AI',
});

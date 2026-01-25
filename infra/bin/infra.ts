#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NeuroConceptsStack } from '../lib/infra-stack';

const app = new cdk.App();

const defaultEnv = { 
  account: process.env.CDK_DEFAULT_ACCOUNT, 
  region: 'eu-central-1' 
};

// 1. Dev Environment (For developers)
new NeuroConceptsStack(app, 'NeuroConcepts-Dev', {
  env: defaultEnv,
  stageName: 'dev',
  description: 'Development environment for NeuroConcepts AI',
});

// 2. Stage Environment (Pre-production mirror)
new NeuroConceptsStack(app, 'NeuroConcepts-Stage', {
  env: defaultEnv,
  stageName: 'stage',
  description: 'Staging environment for final testing',
});

// 3. Prod Environment (Live)
new NeuroConceptsStack(app, 'NeuroConcepts-Prod', {
  env: defaultEnv,
  stageName: 'prod',
  description: 'Production environment for NeuroConcepts AI',
});

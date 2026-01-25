import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as amplify from '@aws-cdk/aws-amplify-alpha';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as path from 'path';

export interface NeuroConceptsStackProps extends cdk.StackProps {
  stageName: 'dev' | 'stage' | 'prod';
}

export class NeuroConceptsStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly dbSecret: secretsmanager.Secret;
  public readonly dbEndpoint: string;

  constructor(scope: Construct, id: string, props: NeuroConceptsStackProps) {
    super(scope, id, props);

    // Tagging strategy: All resources get a 'Stage' tag
    cdk.Tags.of(this).add('Stage', props.stageName);
    cdk.Tags.of(this).add('Project', 'NeuroConcepts');

    // --- 1. Network Stack (VPC) ---
    const natGateways = props.stageName === 'dev' ? 0 : 1;

    this.vpc = new ec2.Vpc(this, 'NeuroConceptsVPC', {
      maxAzs: 2,
      natGateways: natGateways,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        ...(props.stageName !== 'dev' ? [{
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        }] : []),
      ],
    });

    // --- 2. Database Stack (PostgreSQL) ---
    this.dbSecret = new secretsmanager.Secret(this, 'DBSecret', {
      secretName: `NeuroConcepts-DB-Secret-${props.stageName}`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'postgres' }),
        excludePunctuation: true,
        includeSpace: false,
        generateStringKey: 'password',
      },
    });

    const dbSg = new ec2.SecurityGroup(this, 'DBSecurityGroup', {
      vpc: this.vpc,
      description: 'Allow access to DB',
      allowAllOutbound: true,
    });

    // Allow public access to DB in Dev (so Lambda outside VPC can reach it)
    if (props.stageName === 'dev') {
      dbSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(5432), 'Allow public access to DB in Dev');
    }

    if (props.stageName === 'dev' || props.stageName === 'stage') {
      const instance = new rds.DatabaseInstance(this, 'PostgresInstance', {
        engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_16 }),
        vpc: this.vpc,
        // In Dev (0 NAT), DB must be public or isolated. Public allows easy access.
        // In Stage (1 NAT), we could use Private, but to keep it cheap and consistent with Dev (t4g.micro), we use Public for now or Private if NAT exists.
        // Actually, if we use t4g.micro in Stage, we should put it in Private subnet if NAT exists, or Public if not.
        // But to avoid the "WithExpressConfiguration" error of Aurora Free Tier entirely, we use RDS Instance for Stage too.
        vpcSubnets: { subnetType: props.stageName === 'dev' ? ec2.SubnetType.PUBLIC : ec2.SubnetType.PRIVATE_WITH_EGRESS },
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
        allocatedStorage: 20,
        maxAllocatedStorage: 50,
        credentials: rds.Credentials.fromSecret(this.dbSecret),
        securityGroups: [dbSg],
        publiclyAccessible: props.stageName === 'dev', // Only Dev is public
        removalPolicy: cdk.RemovalPolicy.DESTROY, 
      });
      this.dbEndpoint = instance.dbInstanceEndpointAddress;
    } else {
      const cluster = new rds.DatabaseCluster(this, 'AuroraCluster', {
        engine: rds.DatabaseClusterEngine.auroraPostgres({ version: rds.AuroraPostgresEngineVersion.VER_15_4 }),
        vpc: this.vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        writer: rds.ClusterInstance.serverlessV2('Writer'),
        serverlessV2MinCapacity: 0.5,
        serverlessV2MaxCapacity: 4, // Limit for free tier / trial accounts
        credentials: rds.Credentials.fromSecret(this.dbSecret),
        securityGroups: [dbSg],
        defaultDatabaseName: 'neuroconcepts',
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      });
      this.dbEndpoint = cluster.clusterEndpoint.hostname;
    }

    // --- 3. E-Mail Intake (S3 + Lambda) ---
    const emailBucket = new s3.Bucket(this, 'EmailIngestBucket', {
      versioned: false,
      removalPolicy: props.stageName === 'dev' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: props.stageName === 'dev',
      lifecycleRules: [{ expiration: cdk.Duration.days(7) }]
    });

    const emailProcessor = new lambdaNode.NodejsFunction(this, 'EmailProcessor', {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, '../src/services/email-parser/index.ts'),
      handler: 'handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        STAGE: props.stageName,
        DB_SECRET_ARN: this.dbSecret.secretArn,
        DB_ENDPOINT: this.dbEndpoint,
      },
      bundling: { minify: true, sourceMap: true },
    });

    emailBucket.grantRead(emailProcessor);
    this.dbSecret.grantRead(emailProcessor);
    emailBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(emailProcessor));

    // --- 4. Orchestrator Service (Lambda + API Gateway) ---
    
    // In Dev: Run Lambda OUTSIDE VPC (to get Internet access) and connect to Public DB
    // In Prod: Run Lambda INSIDE VPC (Private Subnet) and connect to Private DB via NAT Gateway (for Internet)
    const lambdaVpc = props.stageName === 'dev' ? undefined : this.vpc;
    const lambdaSg = props.stageName === 'dev' ? undefined : [dbSg]; // Only need SG if in VPC

    const orchestratorLambda = new lambdaNode.NodejsFunction(this, 'OrchestratorLambda', {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, '../../src/services/orchestrator/src/index.ts'),
      handler: 'handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      vpc: lambdaVpc,
      vpcSubnets: props.stageName === 'dev' ? undefined : { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: lambdaSg,
      environment: {
        STAGE: props.stageName,
        DB_SECRET_ARN: this.dbSecret.secretArn,
        DB_ENDPOINT: this.dbEndpoint,
      },
      bundling: { minify: true, sourceMap: true },
    });

    // Grant DB Access
    this.dbSecret.grantRead(orchestratorLambda);
    
    // API Gateway
    const api = new apigateway.LambdaRestApi(this, 'OrchestratorApi', {
      handler: orchestratorLambda,
      proxy: true,
      deployOptions: {
        stageName: props.stageName,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      }
    });

    // --- 5. Frontend (Amplify) ---
    // Note: We only create the Amplify App once (in Dev stack for simplicity, or we can have separate apps)
    // Here we create one App per stage to keep them isolated.
    
    const amplifyApp = new amplify.App(this, 'NeuroConceptsFrontend', {
      appName: `NeuroConcepts-${props.stageName}`,
      sourceCodeProvider: new amplify.GitHubSourceCodeProvider({
        owner: 'option-ai-aut',
        repository: 'neuroconcepts',
        oauthToken: cdk.SecretValue.secretsManager('github-token'), // Requires 'github-token' in Secrets Manager
      }),
      autoBranchCreation: {
        patterns: ['main', 'dev/*'],
      },
      environmentVariables: {
        NEXT_PUBLIC_API_URL: api.url,
        AMPLIFY_MONOREPO_APP_ROOT: 'frontend',
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '1.0',
        applications: [
          {
            frontend: {
              phases: {
                preBuild: {
                  commands: ['npm ci'],
                },
                build: {
                  commands: ['npm run build'],
                },
              },
              artifacts: {
                baseDirectory: '.next',
                files: ['**/*'],
              },
              cache: {
                paths: ['node_modules/**/*'],
              },
            },
            appRoot: 'frontend',
          },
        ],
      }),
    });

    const mainBranch = amplifyApp.addBranch('main');

    // --- Outputs ---
    new cdk.CfnOutput(this, 'VpcId', { value: this.vpc.vpcId });
    new cdk.CfnOutput(this, 'DBEndpoint', { value: this.dbEndpoint });
    new cdk.CfnOutput(this, 'EmailBucketName', { value: emailBucket.bucketName });
    new cdk.CfnOutput(this, 'OrchestratorApiUrl', { value: api.url });
    new cdk.CfnOutput(this, 'AmplifyAppId', { value: amplifyApp.appId });
  }
}

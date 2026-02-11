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
import * as apprunner from 'aws-cdk-lib/aws-apprunner';
import * as assets from 'aws-cdk-lib/aws-ecr-assets';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as path from 'path';

export interface ImmivoStackProps extends cdk.StackProps {
  stageName: 'dev' | 'test' | 'prod';
}

export class ImmivoStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly dbSecret: secretsmanager.Secret;
  public readonly dbEndpoint: string;
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly adminUserPool: cognito.UserPool;
  public readonly adminUserPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: ImmivoStackProps) {
    super(scope, id, props);

    // Tagging strategy: All resources get a 'Stage' tag
    cdk.Tags.of(this).add('Stage', props.stageName);
    cdk.Tags.of(this).add('Project', 'Immivo');

    // --- 1. Network Stack (VPC) ---
    const natGateways = props.stageName === 'dev' ? 0 : 1;

    this.vpc = new ec2.Vpc(this, 'ImmivoVPC', {
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
      secretName: `Immivo-DB-Secret-${props.stageName}`,
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

    if (props.stageName === 'dev' || props.stageName === 'test') {
      const instance = new rds.DatabaseInstance(this, 'PostgresInstance', {
        engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_16 }),
        vpc: this.vpc,
        vpcSubnets: { subnetType: props.stageName === 'dev' ? ec2.SubnetType.PUBLIC : ec2.SubnetType.PRIVATE_WITH_EGRESS },
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
        allocatedStorage: 20,
        maxAllocatedStorage: 50,
        credentials: rds.Credentials.fromSecret(this.dbSecret),
        securityGroups: [dbSg],
        publiclyAccessible: props.stageName === 'dev',
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });
      this.dbEndpoint = instance.dbInstanceEndpointAddress;
    } else {
      const cluster = new rds.DatabaseCluster(this, 'AuroraCluster', {
        engine: rds.DatabaseClusterEngine.auroraPostgres({ version: rds.AuroraPostgresEngineVersion.VER_16_6 }),
        vpc: this.vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        writer: rds.ClusterInstance.serverlessV2('Writer'),
        serverlessV2MinCapacity: 0.5,
        serverlessV2MaxCapacity: 4,
        credentials: rds.Credentials.fromSecret(this.dbSecret),
        securityGroups: [dbSg],
        defaultDatabaseName: 'immivo',
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      });
      this.dbEndpoint = cluster.clusterEndpoint.hostname;
    }

    // --- 3. Authentication (Cognito) ---
    this.userPool = new cognito.UserPool(this, 'ImmivoUserPool', {
      userPoolName: `Immivo-Users-${props.stageName}`,
      selfSignUpEnabled: true, // Allow users to register themselves
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      standardAttributes: {
        givenName: { required: true, mutable: true },
        familyName: { required: true, mutable: true },
        phoneNumber: { required: false, mutable: true },
        address: { required: false, mutable: true },
      },
      customAttributes: {
        company_name: new cognito.StringAttribute({ mutable: true }),
        postal_code: new cognito.StringAttribute({ mutable: true }),
        city: new cognito.StringAttribute({ mutable: true }),
        country: new cognito.StringAttribute({ mutable: true }),
      },
      removalPolicy: props.stageName === 'dev' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
    });

    this.userPoolClient = this.userPool.addClient('ImmivoClient', {
      userPoolClientName: `Immivo-Client-${props.stageName}`,
      generateSecret: false, // Web apps cannot keep secrets
      authFlows: {
        userSrp: true,
      },
    });

    // --- 3b. Admin Authentication (Separate Cognito User Pool) ---
    // Completely separate from Makler accounts - no self-sign-up
    this.adminUserPool = new cognito.UserPool(this, 'ImmivoAdminUserPool', {
      userPoolName: `Immivo-Admins-${props.stageName}`,
      selfSignUpEnabled: false, // Only manually created admin accounts
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      standardAttributes: {
        givenName: { required: true, mutable: true },
        familyName: { required: true, mutable: true },
      },
      removalPolicy: props.stageName === 'dev' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
    });

    this.adminUserPoolClient = this.adminUserPool.addClient('ImmivoAdminClient', {
      userPoolClientName: `Immivo-Admin-Client-${props.stageName}`,
      generateSecret: false,
      authFlows: {
        userSrp: true,
        adminUserPassword: true, // Allow admin-created users to set password on first login
      },
    });

    // --- 4. Orchestrator Service (Lambda + API Gateway) ---
    
    const lambdaVpc = props.stageName === 'dev' ? undefined : this.vpc;
    const lambdaSg = props.stageName === 'dev' ? undefined : [dbSg]; 

    // App secrets (API keys, OAuth credentials, encryption keys)
    // These are stored securely in Secrets Manager and read at runtime
    // Note: Secret values must be set manually in AWS Console after deployment
    const appSecret = secretsmanager.Secret.fromSecretNameV2(
      this, 
      'AppSecret', 
      `Immivo-App-Secret-${props.stageName}`
    );

    // Pre-calculate absolute path to prisma folder (resolved at CDK synth time)
    const prismaDir = path.resolve(__dirname, '../../src/services/orchestrator/prisma');
    
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
        USER_POOL_ID: this.userPool.userPoolId,
        CLIENT_ID: this.userPoolClient.userPoolClientId,
        ADMIN_USER_POOL_ID: this.adminUserPool.userPoolId,
        ADMIN_CLIENT_ID: this.adminUserPoolClient.userPoolClientId,
        APP_SECRET_ARN: appSecret.secretArn,
      },
      bundling: { 
        minify: true, 
        sourceMap: true,
        // Prisma needs special handling for Lambda - do everything in afterBundling
        commandHooks: {
          beforeBundling(inputDir: string, outputDir: string): string[] {
            return [];
          },
          beforeInstall(inputDir: string, outputDir: string): string[] {
            return [];
          },
          afterBundling(inputDir: string, outputDir: string): string[] {
            // Copy prisma schema, install prisma with specific version, generate client
            return [
              `cp -R ${prismaDir} ${outputDir}/`,
              `cd ${outputDir}`,
              `npm init -y`,
              `npm install @prisma/client@5.10.2 prisma@5.10.2`,
              `npx prisma generate`,
              `rm -rf node_modules/@prisma/engines`,
              `rm -rf node_modules/.bin`,
              `rm -rf node_modules/prisma`,
            ];
          },
        },
      },
    });

    this.dbSecret.grantRead(orchestratorLambda);
    appSecret.grantRead(orchestratorLambda);
    
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

    // --- 5. E-Mail Intake (S3 + Lambda) ---
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
        ORCHESTRATOR_API_URL: api.url,
      },
      bundling: { minify: true, sourceMap: true },
    });

    emailBucket.grantRead(emailProcessor);
    this.dbSecret.grantRead(emailProcessor);
    emailBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(emailProcessor));

    // --- 6. Frontend (Lambda + Web Adapter) ---
    // We use Lambda with Docker and the AWS Lambda Web Adapter for a serverless Next.js app.
    
    const frontendLambda = new lambda.DockerImageFunction(this, 'FrontendLambda', {
      code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, '../../frontend'), {
        buildArgs: {
          NEXT_PUBLIC_AWS_REGION: this.region,
        },
      }),
      memorySize: 2048, // Next.js needs some memory
      timeout: cdk.Duration.seconds(30),
      environment: {
        // RUNTIME_ vars are read at runtime by the /api/config endpoint
        // These work because they're not prefixed with NEXT_PUBLIC_ (which gets replaced at build time)
        RUNTIME_API_URL: api.url,
        RUNTIME_USER_POOL_ID: this.userPool.userPoolId,
        RUNTIME_USER_POOL_CLIENT_ID: this.userPoolClient.userPoolClientId,
        RUNTIME_ADMIN_USER_POOL_ID: this.adminUserPool.userPoolId,
        RUNTIME_ADMIN_USER_POOL_CLIENT_ID: this.adminUserPoolClient.userPoolClientId,
        RUNTIME_AWS_REGION: this.region,
        // Keep NEXT_PUBLIC_ for backwards compatibility (baked in at build time)
        NEXT_PUBLIC_API_URL: api.url,
        NEXT_PUBLIC_USER_POOL_ID: this.userPool.userPoolId,
        NEXT_PUBLIC_USER_POOL_CLIENT_ID: this.userPoolClient.userPoolClientId,
        NEXT_PUBLIC_AWS_REGION: this.region,
        PORT: '3000',
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/extensions/lambda-adapter', // Enable Web Adapter
      },
    });

    const frontendUrl = frontendLambda.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ['*'],
        allowedMethods: [lambda.HttpMethod.ALL],
        allowedHeaders: ['*'],
      },
    });

    // --- Outputs ---
    new cdk.CfnOutput(this, 'VpcId', { value: this.vpc.vpcId });
    new cdk.CfnOutput(this, 'DBEndpoint', { value: this.dbEndpoint });
    new cdk.CfnOutput(this, 'EmailBucketName', { value: emailBucket.bucketName });
    new cdk.CfnOutput(this, 'OrchestratorApiUrl', { value: api.url });
    new cdk.CfnOutput(this, 'FrontendUrl', { value: frontendUrl.url });
    new cdk.CfnOutput(this, 'UserPoolId', { value: this.userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: this.userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'AdminUserPoolId', { value: this.adminUserPool.userPoolId });
    new cdk.CfnOutput(this, 'AdminUserPoolClientId', { value: this.adminUserPoolClient.userPoolClientId });
  }
}

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
import * as kms from 'aws-cdk-lib/aws-kms';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';
import * as logs from 'aws-cdk-lib/aws-logs';
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
      allowAllOutbound: false,
    });

    // Dev: restrict to known developer IPs instead of 0.0.0.0/0
    // Set DEV_ALLOWED_IPS as comma-separated CIDRs in cdk.context.json or via -c flag
    if (props.stageName === 'dev') {
      const devIps = this.node.tryGetContext('devAllowedIps') as string || '';
      if (devIps) {
        for (const cidr of devIps.split(',').map((s: string) => s.trim()).filter(Boolean)) {
          dbSg.addIngressRule(ec2.Peer.ipv4(cidr), ec2.Port.tcp(5432), `Dev DB access from ${cidr}`);
        }
      }
    }
    
    // Allow Lambda (same SG) to reach the database
    dbSg.addIngressRule(dbSg, ec2.Port.tcp(5432), 'Allow Lambda to reach DB (self-referencing)');

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
        publiclyAccessible: false,
        storageEncrypted: true,
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
        storageEncrypted: true,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      });
      this.dbEndpoint = cluster.clusterEndpoint.hostname;
    }

    // --- 3. Authentication (Cognito) ---

    // KMS Key for Cognito Custom Email Sender (encrypts verification codes)
    const cognitoEmailKmsKey = new kms.Key(this, 'CognitoEmailKmsKey', {
      description: `Immivo Cognito Email Sender KMS Key (${props.stageName})`,
      enableKeyRotation: true,
      alias: `immivo-cognito-email-${props.stageName}`,
    });

    // Allow Cognito to encrypt codes with this key
    cognitoEmailKmsKey.addToResourcePolicy(new cdk.aws_iam.PolicyStatement({
      effect: cdk.aws_iam.Effect.ALLOW,
      principals: [new cdk.aws_iam.ServicePrincipal('cognito-idp.amazonaws.com')],
      actions: ['kms:CreateGrant', 'kms:Encrypt'],
      resources: ['*'],
    }));

    // Custom Email Sender Lambda — decrypts code + sends branded email via Resend
    const customEmailSenderLambda = new lambdaNode.NodejsFunction(this, 'CustomEmailSenderLambda', {
      functionName: `Immivo-CustomEmailSender-${props.stageName}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, '../src/lambdas/cognito-custom-email-sender/index.ts'),
      handler: 'handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        KEY_ARN: cognitoEmailKmsKey.keyArn,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['@aws-sdk/*', '@smithy/*'],
      },
    });

    // Grant Lambda permission to decrypt codes
    cognitoEmailKmsKey.grantDecrypt(customEmailSenderLambda);

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
      customSenderKmsKey: cognitoEmailKmsKey,
      lambdaTriggers: {
        customEmailSender: customEmailSenderLambda,
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
      customSenderKmsKey: cognitoEmailKmsKey,
      lambdaTriggers: {
        customEmailSender: customEmailSenderLambda,
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
      timeout: cdk.Duration.seconds(120), // 2 min for AI tool calls (Function URL bypasses API GW 29s limit)
      memorySize: 1024, // More memory = faster cold starts + Prisma init
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
        // Flip to 'true' when ready to charge customers
        BILLING_ENABLED: 'false',
      },
      bundling: { 
        minify: true, 
        sourceMap: true,
        // ews-javascript-api uses deasync (native module) which can't be bundled by esbuild
        externalModules: ['@aws-sdk/*', '@smithy/*', 'ews-javascript-api', 'deasync', 'http-cookie-agent', 'sharp'],
        // Prisma + EWS need special handling for Lambda - do everything in afterBundling
        commandHooks: {
          beforeBundling(inputDir: string, outputDir: string): string[] {
            return [];
          },
          beforeInstall(inputDir: string, outputDir: string): string[] {
            return [];
          },
          afterBundling(inputDir: string, outputDir: string): string[] {
            // Copy prisma schema, install prisma with specific version + EWS deps, generate client
            return [
              `cp -R ${prismaDir} ${outputDir}/`,
              `cd ${outputDir}`,
              `npm init -y`,
              `npm install @prisma/client@5.10.2 prisma@5.10.2 ews-javascript-api`,
              `npm install --os=linux --cpu=x64 sharp`,
              `npx prisma generate`,
              `rm -rf node_modules/@prisma/engines`,
              `rm -rf node_modules/.bin`,
              `rm -rf node_modules/prisma`,
            ];
          },
        },
      },
    });

    // --- Media Upload Bucket (Property Images, Floorplans, Documents) ---
    const mediaBucket = new s3.Bucket(this, 'MediaBucket', {
      versioned: props.stageName === 'prod',
      removalPolicy: props.stageName === 'dev' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: props.stageName === 'dev',
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
        allowedOrigins: [
          'https://dev.immivo.ai',
          'https://test.immivo.ai',
          'https://app.immivo.ai',
          'https://immivo.ai',
          'https://www.immivo.ai',
          'https://admin.immivo.ai',
          'http://localhost:3000',
        ],
        allowedHeaders: ['*'],
        exposedHeaders: ['Content-Length', 'Content-Type', 'ETag'],
        maxAge: 3600,
      }],
    });

    // Grant orchestrator Lambda read/write access to the media bucket
    mediaBucket.grantReadWrite(orchestratorLambda);

    // Add bucket name to orchestrator Lambda environment
    orchestratorLambda.addEnvironment('MEDIA_BUCKET_NAME', mediaBucket.bucketName);

    this.dbSecret.grantRead(orchestratorLambda);
    appSecret.grantRead(orchestratorLambda);

    // Grant Custom Email Sender Lambda access to app secret (contains RESEND_API_KEY)
    customEmailSenderLambda.addEnvironment('APP_SECRET_ARN', appSecret.secretArn);
    appSecret.grantRead(customEmailSenderLambda);

    // Grant Cognito admin access (invite/delete/manage users)
    orchestratorLambda.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
      actions: [
        'cognito-idp:AdminCreateUser',
        'cognito-idp:AdminDeleteUser',
        'cognito-idp:AdminGetUser',
        'cognito-idp:AdminUpdateUserAttributes',
        'cognito-idp:AdminSetUserPassword',
        'cognito-idp:ListUsers',
      ],
      resources: [this.userPool.userPoolArn, this.adminUserPool.userPoolArn],
    }));

    // Grant Cost Explorer access for the finance dashboard
    orchestratorLambda.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
      actions: ['ce:GetCostAndUsage', 'ce:GetCostForecast', 'ce:GetDimensionValues'],
      resources: ['*'],
    }));

    // Lambda Function URL for streaming endpoints (bypasses API Gateway 29s timeout)
    const allowedStreamOrigins = [
      'https://dev.immivo.ai', 'https://test.immivo.ai',
      'https://app.immivo.ai', 'https://immivo.ai',
      'https://admin.immivo.ai', 'http://localhost:3000',
    ];
    const functionUrl = orchestratorLambda.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
    });

    // Export the Function URL for frontend to use for streaming
    new cdk.CfnOutput(this, 'OrchestratorFunctionUrl', {
      value: functionUrl.url,
      description: 'Lambda Function URL for streaming (bypasses API GW 29s limit)',
    });

    const corsOrigins = [
      'https://dev.immivo.ai', 'https://test.immivo.ai',
      'https://app.immivo.ai', 'https://immivo.ai',
      'https://www.immivo.ai', 'https://admin.immivo.ai',
      ...(props.stageName === 'dev' ? ['http://localhost:3000', 'http://localhost:3001'] : []),
    ];

    const api = new apigateway.LambdaRestApi(this, 'OrchestratorApi', {
      handler: orchestratorLambda,
      proxy: true,
      deployOptions: {
        stageName: props.stageName,
      },
      binaryMediaTypes: ['multipart/form-data', 'image/*', 'application/octet-stream'],
      defaultCorsPreflightOptions: {
        allowOrigins: corsOrigins,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'X-Admin-Secret'],
      }
    });

    // Gateway Responses: CORS headers on error responses so the browser doesn't block them
    const gatewayResponseHeaders = {
      'Access-Control-Allow-Origin': `'${corsOrigins[0]}'`,
      'Access-Control-Allow-Headers': "'Content-Type,Authorization,X-Admin-Secret'",
      'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,PATCH,OPTIONS'",
    };
    api.addGatewayResponse('Default4XX', {
      type: apigateway.ResponseType.DEFAULT_4XX,
      responseHeaders: gatewayResponseHeaders,
    });
    api.addGatewayResponse('Default5XX', {
      type: apigateway.ResponseType.DEFAULT_5XX,
      responseHeaders: gatewayResponseHeaders,
    });

    // --- 5. E-Mail Intake (S3 + Lambda) ---
    const emailBucket = new s3.Bucket(this, 'EmailIngestBucket', {
      versioned: false,
      removalPolicy: props.stageName === 'dev' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: props.stageName === 'dev',
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [{ expiration: cdk.Duration.days(7) }]
    });

    const emailProcessor = new lambdaNode.NodejsFunction(this, 'EmailProcessor', {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, '../../src/services/email-parser/index.ts'),
      handler: 'handler',
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
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
          NEXT_PUBLIC_MEDIA_CDN_URL: `https://${props.stageName === 'prod' ? 'media' : `${props.stageName}-media`}.immivo.ai`,
        },
      }),
      memorySize: 2048, // Next.js needs some memory
      timeout: cdk.Duration.seconds(30),
      environment: {
        // RUNTIME_ vars are read at runtime by the /api/config endpoint
        // These work because they're not prefixed with NEXT_PUBLIC_ (which gets replaced at build time)
        RUNTIME_API_URL: api.url,
        RUNTIME_STREAM_URL: functionUrl.url, // Lambda Function URL — /chat/stream uses streamifyResponse for real SSE
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
    });

    // --- 7. DNS & CDN (Route53, ACM, CloudFront) ---
    // Prod: Manually created CloudFront distributions for app/admin/api/root domains.
    // Dev/Test: CDK-managed CloudFront + Route53 for {stage}.immivo.ai subdomains.

    // Import existing Route53 Hosted Zone (created manually, contains Resend DNS etc.)
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'ImmivoZone', {
      hostedZoneId: 'Z10381383JI4OXGQXAULB',
      zoneName: 'immivo.ai',
    });

    // Import existing ACM certificate (us-east-1, wildcard *.immivo.ai — created manually)
    const certificate = acm.Certificate.fromCertificateArn(
      this, 'ImmivoCert',
      'arn:aws:acm:us-east-1:463090596988:certificate/b61f08cd-54f2-4f62-8e0a-9a69264e0436'
    );

    // CloudFront Origin Access Control for S3 (replaces public read access)
    const mediaOac = new cloudfront.S3OriginAccessControl(this, 'MediaOAC', {
      description: 'OAC for Immivo Media Bucket',
    });

    // --- Media CDN ---
    const mediaDomain = props.stageName === 'prod'
      ? 'media.immivo.ai'
      : `${props.stageName}-media.immivo.ai`;

    const mediaDistribution = new cloudfront.Distribution(this, 'MediaCDN', {
      comment: `Immivo Media CDN (${props.stageName})`,
      domainNames: [mediaDomain],
      certificate: certificate,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(mediaBucket, {
          originAccessControl: mediaOac,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
      },
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    new route53.ARecord(this, 'MediaDnsRecord', {
      zone: hostedZone,
      recordName: mediaDomain.replace('.immivo.ai', ''),
      target: route53.RecordTarget.fromAlias(
        new route53Targets.CloudFrontTarget(mediaDistribution)
      ),
    });

    orchestratorLambda.addEnvironment('MEDIA_CDN_URL', `https://${mediaDomain}`);

    // --- Frontend & API CDN (dev/test only — prod uses manually created distributions) ---
    if (props.stageName !== 'prod') {
      const frontendDomain = cdk.Fn.select(2, cdk.Fn.split('/', frontendUrl.url));
      const apiDomain = `${cdk.Fn.select(2, cdk.Fn.split('/', api.url))}`;

      // Frontend CloudFront: {stage}.immivo.ai -> Frontend Lambda URL
      const frontendOrigin = new origins.HttpOrigin(frontendDomain, {
        protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
      });

      const frontendCdn = new cloudfront.Distribution(this, 'FrontendCDN', {
        comment: `Immivo Frontend (${props.stageName})`,
        domainNames: [`${props.stageName}.immivo.ai`],
        certificate: certificate,
        defaultBehavior: {
          origin: frontendOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
        additionalBehaviors: {
          '/_next/static/*': {
            origin: frontendOrigin,
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
            compress: true,
            allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          },
        },
        httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
        minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      });

      new route53.ARecord(this, 'FrontendDnsRecord', {
        zone: hostedZone,
        recordName: props.stageName,
        target: route53.RecordTarget.fromAlias(
          new route53Targets.CloudFrontTarget(frontendCdn)
        ),
      });

      // API CloudFront: {stage}-api.immivo.ai -> API Gateway
      const apiGwDomain = cdk.Fn.select(0, cdk.Fn.split('/', cdk.Fn.select(1, cdk.Fn.split('://', api.url))));

      const apiCdn = new cloudfront.Distribution(this, 'ApiCDN', {
        comment: `Immivo API (${props.stageName})`,
        domainNames: [`${props.stageName}-api.immivo.ai`],
        certificate: certificate,
        defaultBehavior: {
          origin: new origins.HttpOrigin(apiGwDomain, {
            originPath: `/${props.stageName}`,
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
        httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
        minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      });

      new route53.ARecord(this, 'ApiDnsRecord', {
        zone: hostedZone,
        recordName: `${props.stageName}-api`,
        target: route53.RecordTarget.fromAlias(
          new route53Targets.CloudFrontTarget(apiCdn)
        ),
      });

      // Outputs for non-prod custom domains
      new cdk.CfnOutput(this, 'FrontendCustomUrl', { value: `https://${props.stageName}.immivo.ai` });
      new cdk.CfnOutput(this, 'ApiCustomUrl', { value: `https://${props.stageName}-api.immivo.ai` });
    }

    // --- 8. WAF (Web Application Firewall) ---
    // CloudFront WAF must be in us-east-1; for API Gateway WAF we use regional scope.
    // Here we attach WAF to the API Gateway (regional).
    const apiWaf = new wafv2.CfnWebACL(this, 'ApiWaf', {
      name: `Immivo-API-WAF-${props.stageName}`,
      scope: 'REGIONAL',
      defaultAction: { allow: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: `ImmivoApiWaf-${props.stageName}`,
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          name: 'AWSManagedRulesCommonRuleSet',
          priority: 1,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
            },
          },
          visibilityConfig: { cloudWatchMetricsEnabled: true, metricName: 'CommonRules', sampledRequestsEnabled: true },
        },
        {
          name: 'AWSManagedRulesSQLiRuleSet',
          priority: 2,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesSQLiRuleSet',
            },
          },
          visibilityConfig: { cloudWatchMetricsEnabled: true, metricName: 'SQLiRules', sampledRequestsEnabled: true },
        },
        {
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
          priority: 3,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesKnownBadInputsRuleSet',
            },
          },
          visibilityConfig: { cloudWatchMetricsEnabled: true, metricName: 'BadInputRules', sampledRequestsEnabled: true },
        },
        {
          name: 'RateLimit',
          priority: 4,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              limit: 2000,
              aggregateKeyType: 'IP',
            },
          },
          visibilityConfig: { cloudWatchMetricsEnabled: true, metricName: 'RateLimit', sampledRequestsEnabled: true },
        },
      ],
    });

    // Associate WAF with API Gateway stage
    new wafv2.CfnWebACLAssociation(this, 'ApiWafAssociation', {
      resourceArn: api.deploymentStage.stageArn,
      webAclArn: apiWaf.attrArn,
    });

    // --- 9. CloudTrail (Audit Logging) ---
    if (props.stageName === 'prod') {
      const trailBucket = new s3.Bucket(this, 'CloudTrailBucket', {
        encryption: s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        enforceSSL: true,
        lifecycleRules: [{ expiration: cdk.Duration.days(90) }],
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      });

      new cloudtrail.Trail(this, 'ImmivoTrail', {
        bucket: trailBucket,
        trailName: `Immivo-Trail-${props.stageName}`,
        isMultiRegionTrail: false,
        includeGlobalServiceEvents: true,
        sendToCloudWatchLogs: true,
        cloudWatchLogGroup: new logs.LogGroup(this, 'TrailLogGroup', {
          logGroupName: `/immivo/cloudtrail/${props.stageName}`,
          retention: logs.RetentionDays.THREE_MONTHS,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
      });
    }

    // --- Outputs ---
    new cdk.CfnOutput(this, 'VpcId', { value: this.vpc.vpcId });
    new cdk.CfnOutput(this, 'DBEndpoint', { value: this.dbEndpoint });
    new cdk.CfnOutput(this, 'EmailBucketName', { value: emailBucket.bucketName });
    new cdk.CfnOutput(this, 'MediaBucketName', { value: mediaBucket.bucketName });
    new cdk.CfnOutput(this, 'MediaCDNUrl', { value: `https://${mediaDomain}` });
    new cdk.CfnOutput(this, 'MediaDistributionId', { value: mediaDistribution.distributionId });
    new cdk.CfnOutput(this, 'OrchestratorApiUrl', { value: api.url });
    new cdk.CfnOutput(this, 'FrontendUrl', { value: frontendUrl.url });
    new cdk.CfnOutput(this, 'UserPoolId', { value: this.userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: this.userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'AdminUserPoolId', { value: this.adminUserPool.userPoolId });
    new cdk.CfnOutput(this, 'AdminUserPoolClientId', { value: this.adminUserPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'WafAclArn', { value: apiWaf.attrArn });
  }
}

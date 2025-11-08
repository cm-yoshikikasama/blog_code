import * as fs from 'node:fs';
import * as path from 'node:path';
import * as cdk from 'aws-cdk-lib';
import * as athena from 'aws-cdk-lib/aws-athena';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import type { Construct } from 'constructs';
import type { AppParameter } from '../parameter';

export interface CrossAccountGlueAthenaStackProps extends cdk.StackProps {
  projectName: string;
  envName: string;
  parameter: AppParameter;
  sourceAccountId: string;
}

export class CrossAccountGlueAthenaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CrossAccountGlueAthenaStackProps) {
    super(scope, id, props);

    const { projectName, envName, sourceAccountId } = props;

    // ========================================
    // IAM Role - Step Functions Execution Role
    // ========================================
    const stepFunctionsExecutionRole = new iam.Role(this, 'StepFunctionsExecutionRole', {
      roleName: `${projectName}-${envName}-sfn-execution-role`,
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
      description: 'Execution role for Step Functions to execute cross-account Athena queries',
    });

    // ========================================
    // Target Account - S3 Bucket for data storage
    // ========================================
    const targetDataBucket = new s3.Bucket(this, 'TargetDataBucket', {
      bucketName: `${projectName}-${envName}-target-data`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Grant Step Functions execution role access to target bucket
    targetDataBucket.grantReadWrite(stepFunctionsExecutionRole);

    // Target database name (created manually via SQL)
    const targetDatabaseName = 'cm_kasama_cross_account_target_db';

    // ========================================
    // Target Account - Athena Workgroup with AWS Managed Storage
    // ========================================
    const targetWorkgroup = new athena.CfnWorkGroup(this, 'TargetAthenaWorkgroup', {
      name: `${projectName}-${envName}-target-workgroup`,
      description: 'Athena workgroup with AWS managed storage for target account queries',
      workGroupConfiguration: {
        enforceWorkGroupConfiguration: true,
        publishCloudWatchMetricsEnabled: true,
        engineVersion: {
          selectedEngineVersion: 'AUTO',
        },
        managedQueryResultsConfiguration: {
          enabled: true,
        },
      },
    });

    // Grant Athena permissions to Step Functions execution role
    stepFunctionsExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'AllowAthenaQueryExecution',
        effect: iam.Effect.ALLOW,
        actions: [
          'athena:StartQueryExecution',
          'athena:GetQueryExecution',
          'athena:GetQueryResults',
          'athena:StopQueryExecution',
          'athena:GetDataCatalog',
        ],
        resources: [
          `arn:aws:athena:${this.region}:${this.account}:workgroup/${targetWorkgroup.name}`,
          `arn:aws:athena:${this.region}:${this.account}:datacatalog/*`,
        ],
      })
    );

    // Grant Glue permissions to Step Functions execution role
    // - Target Catalog: Read/Write for INSERT query
    // - Source Catalog: Read-only via registered Data Catalog (enabled by Source Account's Resource Policy)
    stepFunctionsExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'AllowTargetGlueCatalogAccess',
        effect: iam.Effect.ALLOW,
        actions: [
          'glue:GetDatabase',
          'glue:GetTable',
          'glue:GetPartitions',
          'glue:BatchCreatePartition',
        ],
        resources: [
          `arn:aws:glue:${this.region}:${this.account}:catalog`,
          `arn:aws:glue:${this.region}:${this.account}:database/${targetDatabaseName}`,
          `arn:aws:glue:${this.region}:${this.account}:table/${targetDatabaseName}/*`,
        ],
      })
    );

    stepFunctionsExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'AllowSourceGlueCatalogReadAccess',
        effect: iam.Effect.ALLOW,
        actions: ['glue:GetDatabase', 'glue:GetTable', 'glue:GetPartitions'],
        resources: [
          `arn:aws:glue:${this.region}:${sourceAccountId}:catalog`,
          `arn:aws:glue:${this.region}:${sourceAccountId}:database/*`,
          `arn:aws:glue:${this.region}:${sourceAccountId}:table/*/*`,
        ],
      })
    );

    // Grant S3 read access to Source Account bucket
    stepFunctionsExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'AllowSourceS3BucketReadAccess',
        effect: iam.Effect.ALLOW,
        actions: ['s3:GetObject', 's3:ListBucket'],
        resources: [
          `arn:aws:s3:::${projectName}-${envName}-data`,
          `arn:aws:s3:::${projectName}-${envName}-data/*`,
        ],
      })
    );

    // ========================================
    // Athena Data Catalog - Register Source Account Catalog
    // ========================================
    const sourceCatalogName = 'source_catalog';
    new athena.CfnDataCatalog(this, 'SourceDataCatalog', {
      name: sourceCatalogName,
      type: 'GLUE',
      description: 'Cross-account Glue Data Catalog from Source Account',
      parameters: {
        'catalog-id': sourceAccountId,
      },
    });

    // ========================================
    // Step Functions - Athena Query State Machine
    // ========================================
    // Load INSERT query from file
    const insertTemplate = fs.readFileSync(
      path.join(__dirname, '../../target/insert-query.sql'),
      'utf-8'
    );
    const insertQuery = insertTemplate
      .replace('${TARGET_DATABASE}', targetDatabaseName)
      .replace('${SOURCE_CATALOG}', sourceCatalogName);

    // Execute INSERT query with .sync integration (waits for completion automatically)
    const executeInsertQuery = new tasks.AthenaStartQueryExecution(this, 'ExecuteInsertQuery', {
      queryString: insertQuery,
      workGroup: targetWorkgroup.name,
      integrationPattern: sfn.IntegrationPattern.RUN_JOB,
      comment: 'Execute cross-account INSERT query and wait for completion',
    });

    // Create state machine
    new sfn.StateMachine(this, 'AthenaInsertStateMachine', {
      stateMachineName: `${projectName}-${envName}-athena-insert`,
      definitionBody: sfn.DefinitionBody.fromChainable(executeInsertQuery),
      role: stepFunctionsExecutionRole,
      timeout: cdk.Duration.minutes(10),
      comment:
        'Cross-account Athena INSERT: Copy data from Source Account Glue Catalog to Target Account table',
    });
  }
}

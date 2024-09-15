import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { Role } from 'aws-cdk-lib/aws-iam';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { StateMachine, Choice, Condition, Pass, IChainable, Chain } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke, DynamoGetItem, DynamoAttributeValue } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { SfnStateMachine } from 'aws-cdk-lib/aws-events-targets';


export interface IFunctionProps {
    systemTable: ITable;
    tenant: string;
  }
  
export class FunctionStack extends Stack {
    constructor(scope: Construct, id: string, config: IFunctionProps, props?: StackProps) {
        super(scope, id, props);
        const role = Role.fromRoleArn(this, 'Role', '<your-role-arn>');
        const adminRole = Role.fromRoleArn(this, 'AdminRole', '<your-admin-role-arn>');
        
    }
}
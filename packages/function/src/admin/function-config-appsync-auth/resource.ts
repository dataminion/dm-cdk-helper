import {Duration} from 'aws-cdk-lib';
import {Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export const env = 
    {
        USER_POOL_ID: '',
        USER_POOL_CLIENT_ID: '',
        IDENTITY_POOL_ID: '',
        ROLE_ARN: '',
        ADMIN_ROLE_ARN: '',
        DEPLOYED_REGION: ''
    }

export const fnCnfAppSyncAuth = function(scope: Construct){
    return new Function(scope, 'FnCnfAuth', {
      functionName: 'function-config',
      runtime: Runtime.NODEJS_18_X,
      handler: 'handler.handler',
      code: Code.fromAsset('handler.ts'),
      timeout: Duration.seconds(60),
      environment: env
    });
}

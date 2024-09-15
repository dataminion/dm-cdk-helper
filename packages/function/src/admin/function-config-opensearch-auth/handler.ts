import type { Handler } from "aws-lambda";
import { CognitoIdentityClient,  GetIdentityPoolRolesCommand } from "@aws-sdk/client-cognito-identity";

import { Logger } from "@aws-lambda-powertools/logger";
import { env } from './resource';

const logger = new Logger({
    logLevel: "INFO",
    serviceName: "config-auth",
});

const cognitoClient = new CognitoIdentityClient({});

export const handler: Handler = async () => {
    const userPoolId = env.USER_POOL_ID!;
    const identityPoolId = env.IDENTITY_POOL_ID!;
    const region = env.DEPLOYED_REGION;
    const roleArn = env.ROLE_ARN!;

    try {
         // Fetch the identity pool details
         const getRolesCommand = new GetIdentityPoolRolesCommand({
            IdentityPoolId: identityPoolId,
        });
        const identityPoolData = await cognitoClient.send(getRolesCommand);
        const masterUserArn = identityPoolData.Roles?.authenticated; // Adjust if needed
        if (!masterUserArn) {
            throw new Error('Authenticated role ARN not found');
        }
       logger.info(`Domain updated successfully`);
    } catch (error: any) {
        logger.error(`Failed to update domain: ${error.toString()}`);
        throw error;
    }
};
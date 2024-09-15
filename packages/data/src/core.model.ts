import { a } from '@aws-amplify/backend';

//*****************************/
//  Generic system table to 
//  hold state configuration
//  for things like run once
//  lambda functions. 
//*****************************/
    export const SystemTable =  a
        .model({
        id: a.id().required(),
        tenant: a.string().required(),
        payload: a.json()
        })
        .identifier(["id","tenant"])
        .authorization(allow => [
            allow.group('ADMINS'),            
          ]);
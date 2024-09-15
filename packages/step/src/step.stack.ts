import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { StateMachine, Choice, Condition, Pass, IChainable, Chain } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke, DynamoGetItem, DynamoAttributeValue } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { SfnStateMachine } from 'aws-cdk-lib/aws-events-targets';

/**
 * Interface defining the properties required for creating a StepFunctionStack.
 * 
 * @property {ITable} systemTableName - The DynamoDB table to be used for tracking state.
 * @property {string} tenant - The tenant identifier, used for multi-tenant configurations.
 * @property {Map<string, ILambdaRegistery>} fnRegistry - A map of Lambda functions with metadata 
 *                                                        about whether they should repeat or not.
 */
export interface IStepFunctionProps {
  systemTableName: ITable;
  tenant: string;
  fnRegistry: Map<string, ILambdaRegistery>;
}

/**
* Interface defining the properties of a Lambda registry entry.
* 
* @property {Function} fn - The Lambda function object.
* @property {boolean} repeat - Flag indicating whether the Lambda function should repeat 
*                              or run only once.
*/
export interface ILambdaRegistery {
  fn: Function;
  repeat: boolean;
}

/**
 * Custom StepFunctionStack by @DataMinion
 * 
 * This class defines an AWS CDK Stack responsible for creating a Step Function-based workflow 
 * that coordinates multiple Lambda invocations, with optional single-run logic for each Lambda.
 * 
 * The stack uses a combination of LambdaInvoke, DynamoGetItem, and Choice tasks in Step Functions to
 * implement a conditional workflow that checks DynamoDB for each Lambda's status and skips execution
 * if it has already been marked as successful.
 * 
 * Each Lambda in the config map (fnRegistry) will process in order. If additional steps need to be 
 * added manually, you can extend the chain using `this.chainLink`. Example usage:
 * 
 * Example:
 * ```typescript
 * this.chain = this.chainLink
 *     .next(this.registerFn(someLambdaFunctionObject))
 *     .next(
 *         new DynamoGetItem(this, `Check the outcome of some other Lambda`, {
 *             table: this.systemTableName,
 *             key: { id: DynamoAttributeValue.fromString('system row key'), tenant:DynamoAttributeValue.fromString(this.tenant) },
 *             resultPath: '$.dynamodbResult',  // Store the result of DynamoDB query
 *         })
 *     )
 *     .next(
 *         new Choice(this, `What was the outcome of some other Lambda?`)
 *             .when(
 *                 Condition.stringEquals('$.dynamodbResult.Item.payload.S', 'true'),
 *                 new Pass(this, `Skip the lambda at this step`)  // Skip the Lambda if success is true
 *             )
 *             .otherwise(this.registerFn(someOtherLambdaFunctionObject))
 *     );
 * ```
 * 
 * If no additional custom logic is needed, simply use:
 * ```typescript
 * this.chain = this.chainLink;
 * ```
 * 
 * @property {ITable} systemTableName - The DynamoDB table to be used for tracking state.
 * @property {string} tenant - The tenant identifier, used for multi-tenant configurations.
 * @property {Map<string, ILambdaRegistery>} fnRegistry - A map of Lambda functions with metadata 
 *                                                        about whether they should repeat or not.
 */
export class StepFunctionStack extends Stack {
    // A map to store references to IChainable tasks (like LambdaInvoke, Choice, etc.) created in the process
    private items: Map<string, IChainable>;

    // The state machine that will be created in the stack
    public stateMachine!: StateMachine;

    // DynamoDB table for storing state and tenant info
    public systemTableName!: ITable;
    
    // The tenant identifier for multi-tenant use cases
    public tenant: string;

    // The initial Chain used to connect various Step Function tasks
    public chain!: Chain;

    // The final Chain after registering all tasks from the function registry
    public chainLink!: Chain;

    /**
     * Constructor for the StepFunctionStack class.
     * 
     * @param {Construct} scope - The scope in which the stack is defined.
     * @param {string} id - The unique identifier for the stack.
     * @param {IStepFunctionProps} config - Configuration properties for the Step Function, 
     *                                      including the system table, tenant, and function registry.
     * @param {StackProps} [props] - Optional additional stack properties.
     */
    constructor(scope: Construct, id: string, config: IStepFunctionProps, props?: StackProps) {
        super(scope, id, props);

        this.items = new Map();
        const initialPass: Pass = new Pass(this, `Step One For:${id}`);
        this.systemTableName = config.systemTableName;
        this.tenant = config.tenant;

        // Process the function registry and build the final chain
        const registrySteps = this.processRegistry(Chain.start(initialPass), config.fnRegistry);
        this.chainLink = registrySteps;
    }

    /**
     * Processes the function registry and builds a chain of Step Function tasks.
     * 
     * Each Lambda in the function registry is either configured as repeatable or single-run.
     * If it is repeatable, a DynamoDB check is performed first to ensure the Lambda should run.
     * 
     * @param {Chain} chain - The initial chain to which new tasks are added.
     * @param {Map<string, ILambdaRegistery>} fnRegistry - The registry of Lambda functions to process.
     * @returns {Chain} - The updated chain containing all the Step Function tasks.
     */
    processRegistry(chain: Chain, fnRegistry: Map<string, ILambdaRegistery>): Chain {
        let localChain = chain;

        fnRegistry.forEach((item) => {
            if (item.repeat) {
                // Register a Lambda as a single-run function, with a check before execution
                localChain = this.registerSingleRunFn(localChain, item.fn);
            } else {
                // Add the Lambda directly to the chain
                localChain = localChain.next(this.registerFn(item.fn));
            }
        });

        return localChain;
    }

    /**
     * Registers a Lambda function to run only if it hasn't been run successfully before.
     * 
     * This method first adds a DynamoDB `GetItem` task to check if the Lambda's success status
     * is already recorded. If it has, a Pass state will skip the Lambda's execution.
     * 
     * @param {Chain} chain - The chain to which the tasks are appended.
     * @param {Function} lambda - The Lambda function to register.
     * @returns {Chain} - The updated chain.
     */
    registerSingleRunFn(chain: Chain, lambda: Function): Chain {
        const fnStatus = this.registerCheck(lambda.functionName);
        const fnChoice = this.registerChoice(lambda);

        return chain.next(fnStatus).next(fnChoice);
    }

    /**
     * Registers a Lambda function as an invokable task in the Step Function.
     * 
     * @param {Function} lambda - The Lambda function to register.
     * @returns {IChainable} - A LambdaInvoke task representing the invocation of the Lambda.
     */
    registerFn(lambda: Function): IChainable {
        const invokeLambda = new LambdaInvoke(this, `Invoke ${lambda.functionName}`, {
            lambdaFunction: lambda,
            outputPath: '$.Payload',
        });
        this.items.set(lambda.functionName, invokeLambda);

        return invokeLambda;
    }

    /**
     * Registers a DynamoDB GetItem task to check the success status of a Lambda function.
     * 
     * This task queries the `systemTableName` DynamoDB table using the Lambda's name and the tenant ID
     * to determine whether the Lambda has already been run successfully.
     * 
     * @param {string} lambdaName - The name of the Lambda function to check.
     * @returns {IChainable} - A DynamoGetItem task that performs the DynamoDB query.
     */
    registerCheck(lambdaName: string): IChainable {
        const checkLambdaStatus = new DynamoGetItem(this, `Check ${lambdaName} Status`, {
            table: this.systemTableName,
            key: {
                id: DynamoAttributeValue.fromString(lambdaName),
                tenant: DynamoAttributeValue.fromString(this.tenant),
            },
            resultPath: '$.dynamodbResult',  // Store the result of the DynamoDB query
        });
        this.items.set(`check${lambdaName}`, checkLambdaStatus);

        return checkLambdaStatus;
    }

    /**
     * Registers a Choice task that decides whether to skip a Lambda based on its success status.
     * 
     * The choice is made by evaluating whether the DynamoDB query result indicates that the
     * Lambda has already been marked as successful. If so, a Pass task is used to skip it; 
     * otherwise, the Lambda is invoked.
     * 
     * @param {Function} lambda - The Lambda function to register a choice for.
     * @returns {IChainable} - A Choice task that branches the workflow based on success status.
     */
    registerChoice(lambda: Function): IChainable {
        const isLambdaAlreadySuccessful = new Choice(this, `Is ${lambda.functionName} Successful?`)
            .when(
                Condition.stringEquals('$.dynamodbResult.Item.payload.S', 'true'),
                new Pass(this, `Skip ${lambda.functionName}`)  // Skip Lambda if success is true
            )
            .otherwise(this.registerFn(lambda));

        this.items.set(`choose${lambda.functionName}`, isLambdaAlreadySuccessful);

        return isLambdaAlreadySuccessful;
    }

    /**
     * Registers a Step Function state machine with the specified definition and timeout.
     * 
     * @param {Chain} definition - The definition of the state machine (i.e., the chain of tasks).
     * @param {string} name - The name of the state machine.
     * @param {number} timeout - The timeout for the state machine in minutes.
     */
    registerStateMachine(definition: Chain, name: string, timeout: number): void {
        this.stateMachine = new StateMachine(this, name, {
            definition,
            timeout: Duration.minutes(timeout),
        });
    }

    /**
     * Registers an EventBridge Rule that triggers the Step Function at a specified schedule.
     * 
     * @param {string} name - The name of the EventBridge rule.
     * @param {number} scheduleInMinutes - The interval at which the state machine should be triggered.
     */
    registerTrigger(name: string, scheduleInMinutes: number): void {
        const rule = new Rule(this, name, {
            schedule: Schedule.rate(Duration.minutes(scheduleInMinutes)),
        });

        rule.addTarget(new SfnStateMachine(this.stateMachine));
    }
}

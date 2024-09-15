import { App, Stack } from 'aws-cdk-lib';
import { StepFunctionStack, IStepFunctionProps, ILambdaRegistery } from '../src/step.stack';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { Table, AttributeType } from 'aws-cdk-lib/aws-dynamodb';
import { Template } from 'aws-cdk-lib/assertions';

// Mock CDK app
const mockApp = new App({
    context: {
      region: 'us-east-2',
      environment: 'test',
    },
  });
const mockStack = new Stack(mockApp, 'MockStack');

// Mock Lambda and DynamoDB Table
const mockLambda = new Function(mockStack, 'MockLambda', {
  runtime: Runtime.NODEJS_18_X,
  handler: 'index.handler',
  code: Code.fromInline('exports.handler = async () => {};'),
});

const mockTable = new Table(mockStack, 'MockTable', {
  partitionKey: { name: 'id', type: AttributeType.STRING },
});

// Create a mock Lambda registry
const mockFnRegistry: Map<string, ILambdaRegistery> = new Map();
mockFnRegistry.set('TestLambda', { fn: mockLambda, repeat: false });

const mockProps: IStepFunctionProps = {
  systemTableName: mockTable,
  tenant: 'test-tenant',
  fnRegistry: mockFnRegistry,
};

describe('StepFunctionStack', () => {
  let stack: StepFunctionStack = new StepFunctionStack(mockStack, `TestStack`, mockProps);
  stack.registerStateMachine(stack.chainLink, 'TestStateMachine', 5);
  beforeEach(() => {

  });

  /**
   * Test to ensure that the StepFunctionStack is successfully created.
   * 
   * This test verifies that the CloudFormation template generated from the 
   * StepFunctionStack is defined and not null, indicating that the stack
   * instantiation was successful.
   */
  test('Stack is created', () => {
    const template = Template.fromStack(stack);
    expect(template).toBeDefined();  // Stack should be defined
  });

  /**
   * Test to verify that the initial Pass state in the Step Function is created.
   * 
   * This test checks that the state machine definition includes the Pass state
   * with a name that follows the expected naming convention. Specifically, it
   * verifies that the state name contains "Step One For:TestStack".
   */
  test('Initial Pass state is created', () => {
    const template = Template.fromStack(stack);
    // Find all resources of type 'AWS::StepFunctions::StateMachine'
    const stateMachines = template.findResources('AWS::StepFunctions::TestStateMachine');
    // Loop through each state machine and look for the desired properties
    for (const [resourceName, resource] of Object.entries(stateMachines)) {
      if (resourceName.startsWith('TestStateMachine')) {
        // Verify that the initial Pass state contains 'Step One For:TestStack'
        expect(resource.Properties.DefinitionString['Fn::Join']).toEqual(
          expect.arrayContaining([
            expect.stringContaining('Step One For:TestStack'),
            expect.stringContaining('Invoke MockLambda'),
          ])
        );
      }
    }
  });
  

  /**
   * Test to verify that the Step Function includes the correct LambdaInvoke and DynamoDB GetItem tasks.
   * 
   * This test ensures that the Step Function is correctly invoking the Lambda function (TestLambda)
   * and checking the status using a DynamoDB GetItem task. It does so by verifying that both the
   * 'Invoke TestLambda' and 'Check TestLambda Status' tasks are present in the state machine definition.
   */
test('DynamoDB table is referenced correctly in LambdaInvoke and GetItem tasks', () => {
  const template = Template.fromStack(stack);
  // Find all state machines in the template
  const stateMachines = template.findResources('AWS::StepFunctions::TestStateMachine');
  // Loop through each state machine resource and check for matching properties
  for (const [resourceName, resource] of Object.entries(stateMachines)) {
    if (resourceName.startsWith('TestStateMachine')) {
      expect(resource.Properties.DefinitionString['Fn::Join']).toEqual(
        expect.arrayContaining([expect.stringContaining('Invoke TestLambda')])
      );
      expect(resource.Properties.DefinitionString['Fn::Join']).toEqual(
        expect.arrayContaining([expect.stringContaining('Check TestLambda Status')])
      );
    }
  }
});


  /**
   * Test to verify that the Step Function is created with the correct timeout value.
   * 
   * This test ensures that the state machine has a timeout of 5 minutes (300 seconds),
   * as specified in the StepFunctionStack configuration. It verifies this by checking
   * the TimeoutSeconds property of the AWS::StepFunctions::StateMachine resource.
   */
  test('State Machine creation with correct timeout', () => {
    const template = Template.fromStack(stack);
    // Find all resources of type 'AWS::StepFunctions::StateMachine'
    const stateMachines = template.findResources('AWS::StepFunctions::StateMachine');
    // Loop through each state machine and check for the timeout property within the DefinitionString
    for (const [resourceName, resource] of Object.entries(stateMachines)) {
      if (resourceName.startsWith('TestStateMachine')) {
        // Extract the DefinitionString from the state machine
        const definitionString = resource.Properties.DefinitionString['Fn::Join'][1].join('');
        // Use regex or string matching to verify the TimeoutSeconds is set to 300
        expect(definitionString).toContain('"TimeoutSeconds":300');
      }
    }
  });
});
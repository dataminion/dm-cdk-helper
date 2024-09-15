# dm-cdk-helper
 Useful extensions for the AWS CDK v3 by @DataMinion

### Summary of Our Goals with the Repository Creation:

We are building a **reusable AWS CDK helper library** designed to simplify common patterns for AWS Step Functions, Lambda, DynamoDB, and other AWS services. The repository aims to modularize and encapsulate common patterns so that these helpers can be easily reused in different projects.

The primary goals for this repository are:

1. **Encapsulate Common CDK Patterns**:
   - We are developing a set of helper classes and functions to simplify creating and managing Step Functions, Lambda functions, and other AWS services like DynamoDB in an AWS CDK environment.
   - This involves creating well-structured and reusable classes that can be extended, such as `StepFunctionStack`, which automates the creation of Step Functions that invoke multiple Lambda functions and handle conditional logic using DynamoDB.

2. **Modular, Reusable Design**:
   - We want this repository to be modular, allowing individual components (such as Lambda registration, Step Function workflows, or state machine configurations) to be reused independently or extended with custom logic.
   - By using TypeScript, we are ensuring strong type checking and easier extensibility.

3. **Simplified Step Function Management**:
   - We are focusing on making it easier to define Step Function workflows, especially where conditional logic is needed. For instance, using DynamoDB to track whether a Lambda function has run successfully and skipping it in subsequent executions if it's already been processed.
   - This conditional logic is encapsulated in the `registerChoice()` and `registerSingleRunFn()` methods, ensuring a standardized way of managing single-run or repeatable Lambda invocations.

4. **Extensibility for Custom Logic**:
   - The repository is designed to be extensible. We have provided an example in the `StepFunctionStack` class of how developers can add additional logic to the Step Function chains (`this.chainLink`), allowing further customization of workflows.
   - Custom logic (e.g., adding more Lambda invocations, DynamoDB checks, or conditional choices) can easily be added in an organized manner.

5. **Testing Infrastructure**:
   - We are setting up a robust testing infrastructure using **Jest** to ensure that the CDK resources (such as Step Functions, Lambdas, and DynamoDB tables) are being correctly instantiated and configured.
   - The test suite verifies that the stack creation is successful, and the Step Functions are correctly wired with the appropriate tasks, choices, and timeouts.
   - We have also ensured that the tests handle cross-stack and cross-app references properly, as seen in the solution to the error encountered.

### Example Use Case:

In this repository, developers can find:
- Predefined Lambda functions useful for setting up environments
- Predefined Data models and types compatible with Amplify Gen 2
- A Step Function Helper Library that makes chaining togeter post app creation lambdas easier.
    - Support for configuring Lambdas to run once on deploy

The goal is for the repository to be easily installable via npm, that would look like:

```
npm install @dm-cdk-helper;
```

With imports for typescript that would look like:

```typescript
import { StepFunctionStack } from '@dm-cdk-helper/step';
```

### Next Steps:
- Finalizing the core functionality of helper classes (like `StepFunctionStack`).
- Finalizing the core functionality of data package.
- Adding preconfigured lambdas and a stack to install them. 
- Ensuring all CDK patterns are thoroughly tested with a comprehensive suite.
- Preparing the repository for publishing as an npm package, allowing for easy integration into multiple projects.

### Repository layout:

```
    dm-cdk-helpers/            # Root directory of your repository
    ├── packages/              # Directory for sub-packages
    │   ├── step/              # Step package
    │   │   ├── index.ts       # Step-specific entry point
    │   │   ├── tsconfig.json  # Step-specific tsconfig.json
    │   │   ├── package.json   # Step-specific package.json
    │   │   ├── src/           # Source code for the Step package
    │   │   │    └── step.stack.ts
    │   │   └── tests/         # Test suite for the Step package
    │   │        └── step.stack.test.ts
    │   ├── fuction/           # Function package (not yet implemented)
    │   │   ├── index.ts       # Function-specific entry point
    │   │   ├── tsconfig.json  # Function-specific tsconfig.json
    │   │   ├── package.json   # Function-specific package.json
    │   │   ├── src/           # Source code for the Function package
    │   │   │    ├── auth
    │   │   │    │    └── function-config-auth
    │   │   │    │          ├── handler.ts     
    │   │   │    │          └── resource.ts    
    │   │   │    └── function.stack.ts
    │   │   └── tests/         # Test suite for the Function package
    │   │        └── function.stack.test.ts
    │   └── data/              # Data package (not yet working)
    │       ├── index.ts       # Data-specific entry point
    │       ├── tsconfig.json  # Data-specific tsconfig.json
    │       ├── package.json   # Data-specific package.json
    │       ├── src/           # Source code for the Data package
    │       │    ├── core.model.ts
    │       │    └── core.type.ts
    │       └── tests/         # Test suite for the Data package
    │            ├── core.model.test.ts
    │            └── core.type.test.ts
    ├── package.json           # Root package.json with workspaces configuration
    ├── tsconfig.json          # Root TypeScript configuration
    ├── LICENSE                # Apache 2.0 Open Source License file
    └── README.md              # Read Me file for the project
```
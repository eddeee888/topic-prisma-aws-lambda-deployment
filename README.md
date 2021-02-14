# topic-prisma-aws-lambda-deployment

This repo is an example of how to deploying AWS lambdas with lambda layers ft. Typescript, Prisma and Serverless.

Blog post: TBD

## Requirements

- [AWS account](https://aws.amazon.com/account/) - free-tier
- [Serverless account](https://www.serverless.com/) - free-tier
- One AWS RDS Database \*
- One IAM user with access key ID and secret access key \*\*

\* A publicly accessible database was used to test the lambda in this guide. Make sure you have appropriate permissions on your own database.

\*\* An IAM user with full admin access was used to test the lambda in this guide. Make sure you use appropriate permissions for your IAM user

## How it works

### AWS lambda and lambda layers

An AWS lambda has a size limit of 50MB. It may seem like a lot but if we build a lambda with all the dependencies in `node_modules` ( which may include the generated Prisma client ), it would easily go over the limit.

A good practice is to keep only the main business logic in the lambda function. Keeping a lambda small means it takes less time to deploy. All imports should be treated as **external** i.e. as if they come from `node_modules`.

All imports should be split into layers. There can be maximum of 5 layers. In this repo, there are 3 types of layers:

- Runtime dependencies - The only dependency runtime dependency here is `uuid` for testing purpose. It should be the only one in `package.json`'s dependencies field.
- `@prisma/*` - I prefer keeping `@prisma/*` and `.prisma` as its own layer because the way it's created is fairly different from other dependencies.
- `@libs/*` - This includes utility functions that can be shared between lambdas and other apps.

### Prisma binary and AWS lambda

Prisma can generate different binaries for different runtime environment. This can be changed using the `binaryTargets` field in the prisma schema. For example:

```
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["darwin"] // For MacOS
}
```

A client binary only works if used in the environment it's intended for. For example, a client generated on Linux will not work in AWS lambda. If we declare multiple `binaryTargets`, Prisma will generate multiple clients, increasing the total package size.

We want to use `native` when working locally and `rhel-openssl-1.0.x` for lambdas. One way to approach this is to use an environment variable:

```
generator client {
  provider      = "prisma-client-js"
  binaryTargets = [env("PRISMA_BINARY_TARGET")]
}
```

### Serverless and AWS lambda

[Serverless](https://www.serverless.com/) is a powerful framework that can help deploy lambdas and apps easily. We will use this service to orchestrate the deployment of our lambda and lambda layers using a [serverless.yml file](./serverless.yml)

## Lambda functions

Our lambda functions are located in [src/lambdas](./src/lambdas). This will be built into `build/lambdas/*` using Typescript. Check out this [example lambda that inserts a new user](./src/lambdas/insertUser/handler.ts)

### Using @libs/\*

In the sample lambda, we are importing a function to create prisma client:

```ts
import { createPrismaClient } from "@libs/prismaClient";
```

Locally, we use Typescript to map everything starting with `@libs/*` to [src/libs](./src/libs) using [tsconfig paths config](https://github.com/eddeee888/topic-prisma-aws-lambda-deployment/blob/a80ad9ba5131b31ee321a23777a2c5f83332059d/tsconfig.json#L6-L8)

The prod lambda function will import `@libs/*` from a lambda layer ( more on this later ).

## Creating lambda layers

Each layer should be zipped up before sending to AWS. Layers of a NodeJS should have the following structure:

```
layer.zip
  -- nodejs
       -- node_modules
            -- lib1
            -- lib2
  ...
```

You can read more on lambda layers [here](https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html)

In our case, we will split our lambda layers like this:

```
lambda-layers-node_modules.zip
  -- nodejs
       -- node_modules
            -- uuid
```

```
lambda-layers-prisma-client.zip
  -- nodejs
       -- node_modules
            -- .prisma
            -- @prisma
```

```
lambda-layers-libs.zip
  -- nodejs
       -- node_modules
            -- @libs
```

Check out the following scripts that are intended to be run in CI to create the mentioned zip files:

- [prepare-node-modules-lambda-layer.sh](./scripts/ci/prepare-node-modules-lambda-layer.sh)

- [prepare-prisma-client-lambda-layer.sh](./scripts/ci/prepare-prisma-client-lambda-layer.sh)

- [prepare-libs-lambda-layer.sh](./scripts/ci/prepare-libs-lambda-layer.sh)

## Putting it all together and deploy

You can use this sample [github action](./.github/workflows/deploy-lambdas.yml) to deploy the lambda functions, together with their layers. Here's a summary of what it does:

- Build `node_modules` lambda layer
- Build `@prisma/*` lambda layer
- Build `@libs/*` lambda layer
- Build lambda functions
- Once all the previous steps are done, download all built assets and deploy using [serverless.yml](./serverless.yml)

**Note**

- Each lambda layer build step has been customised to avoid overlapping of dependencies in each layer.
- Each lambda layer [is unzipped before being deployed](https://github.com/eddeee888/topic-prisma-aws-lambda-deployment/blob/1738d2ae2e1a6a44b45eefb76bc19d02254b4c41/.github/workflows/deploy-lambdas.yml#L151-L158) because Serverless zips them by default.
- All assets and `serverless.yml` are moved into `./build/lambdas`. This is because the [SERVICE_ROOT](https://github.com/eddeee888/topic-prisma-aws-lambda-deployment/blob/a80ad9ba5131b31ee321a23777a2c5f83332059d/.github/workflows/deploy-lambdas.yml#L168) option seems to tell serverless include more than it should if `./` is used
- When deploying, there are some [AWS and Serverless account env variables](https://github.com/eddeee888/topic-prisma-aws-lambda-deployment/blob/a80ad9ba5131b31ee321a23777a2c5f83332059d/.github/workflows/deploy-lambdas.yml#L169-L171) and some are used to map [environment variables for the lambda functions](https://github.com/eddeee888/topic-prisma-aws-lambda-deployment/blob/a80ad9ba5131b31ee321a23777a2c5f83332059d/.github/workflows/deploy-lambdas.yml#L172-L174) in [serverless.yml](https://github.com/eddeee888/topic-prisma-aws-lambda-deployment/blob/a80ad9ba5131b31ee321a23777a2c5f83332059d/serverless.yml#L32-L33)

---

Made with ❤️ by Eddy Nguyen
https://eddy.works

This repo is extracted from https://github.com/eddeee888/base-app-monorepo

Need coding mentorship? Request a session here: https://jooclass.com/classes/2

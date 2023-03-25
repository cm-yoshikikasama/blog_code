'use strict';
const crypto = require('crypto');

class ResponseSchemaPlugin {

  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = serverless.getProvider('aws');

    this.log = serverless.cli.log;

    serverless.configSchemaHandler.defineFunctionEventProperties('aws', 'http', {
      properties: {
        responseSchemas: {
          type: 'object',
          additionalProperties: false,
          patternProperties: {
            "^[0-9]{3}$": {
              type: 'object',
              properties: {
                "application/json": { type: 'object' },
                "application/xml": { type: 'object' }
              },
            }
          },
        },
      },
    });

    this.hooks = {
      'before:package:finalize': this.package.bind(this),
    };
  }

  package() {
    // Getting all provider Resources
    const resources = this.serverless.service.provider.compiledCloudFormationTemplate.Resources;
    // Making it iterable
    const resouresIterable = Object.entries(resources);

    // Iterating through all functions names
    this.serverless.service.getAllFunctions()
      .forEach(functionName => {
        // Getting Configuration for function
        const functionObject = this.serverless.service.functions[functionName];

        functionObject.events
          // working only on http events with responseSchemas key
          .filter(event => 'http' in event && 'responseSchemas' in event.http)
          .map(event => event.http)
          .forEach(httpEvent => {

            try {
              //looking for the right key method
              const keyMethod = this.findMethodForHttp(resouresIterable, httpEvent.method, httpEvent.path);

              // Onche i have the right method, i inizialize MethodResponses if needed
              if (!resources[keyMethod].Properties.MethodResponses) {
                resources[keyMethod].Properties.MethodResponses = [];
              }

              // Iterating through responseSchemas responses codes to add those
              Object.entries(httpEvent.responseSchemas).forEach(([statusCode, schemas]) => {
                const responseModels = {};
                // Iterating through all contentTypes
                Object.entries(schemas).forEach(
                  ([contentType, schema]) => {

                    const md5 = crypto.createHash('md5');
                    const schemaHash = md5.update(JSON.stringify({ contentType: { schema } })).digest('hex');
                    // i have to create the model, to have unique keys, I use the hash of the model
                    const modelKey = 'ApiGatewayResponseModel' + schemaHash
                    resources[modelKey] = {
                      Type: 'AWS::ApiGateway::Model',
                      Properties: {
                        RestApiId: { Ref: 'ApiGatewayRestApi' },
                        ContentType: contentType,
                        Schema: schema
                      }
                    }
                    // Adding the models ref to the ResponseModels
                    responseModels[contentType] = {
                      Ref: modelKey
                    };
                  }
                );
                const existingMethodResponse = resources[keyMethod].Properties.MethodResponses
                  .find(one => one.StatusCode === statusCode)
                if (existingMethodResponse) {
                  existingMethodResponse.ResponseModels = responseModels
                } else {
                  resources[keyMethod].Properties.MethodResponses.push({
                    StatusCode: statusCode,
                    ResponseModels: {}
                  });
                }
                // Adding the whole configuration for the statusCode

              })
            } catch (e) {
              this.log('Could not find configurations for schemas');
              this.log(e);
            }
          })
      });
  }

  findMethodForHttp(resouresIterable, httpMethod, path, parent = 'RootResourceId') {
    // if this is the last iteration we look into it 
    if (path === '' || path === '/') {
      // finding a method relative to root resource id
      const [keyMethod] = resouresIterable
        .find(([, method]) =>
          method.Type === 'AWS::ApiGateway::Method' &&
          method.Properties.HttpMethod === httpMethod.toUpperCase() &&
          (
            // if this is child of root i usually find it like this
            (
              'Fn::GetAtt' in method.Properties.ResourceId &&
              method.Properties.ResourceId['Fn::GetAtt'][0] === 'ApiGatewayRestApi' &&
              method.Properties.ResourceId['Fn::GetAtt'][1] === parent
            ) ||
            // if this is relative to a Resource i find it with a Ref
            method.Properties.ResourceId.Ref === parent
          )
        );
      return keyMethod;
    } else {

      // i have to explore paths one piece at the time
      const paths = path.split('/')

      // Have to find the right Method to add the response, starting by looking for the resource
      const [keyResource] = resouresIterable.find(
        ([key, resource]) => resource.Type === 'AWS::ApiGateway::Resource' && resource.Properties.PathPart === paths[0]
      );

      // we need to go recursivelyt o explore all the path (i know, recursion is bad)
      return this.findMethodForHttp(resouresIterable, httpMethod, paths.slice(1).join('/'), keyResource);
    }
  }
}

module.exports = ResponseSchemaPlugin;
# @coolgk/mongo

`npm install @coolgk/mongo`

A simple, lightweight javascript / typescript nodejs mvc framework that helps you to create object oriented, modular and testable code.

[![Build Status](https://travis-ci.org/coolgk/node-mvc.svg?branch=master)](https://travis-ci.org/coolgk/node-mvc) [![Coverage Status](https://coveralls.io/repos/github/coolgk/node-mvc/badge.svg?branch=develop)](https://coveralls.io/github/coolgk/node-mvc?branch=develop) [![dependencies Status](https://david-dm.org/coolgk/node-mvc/status.svg)](https://david-dm.org/coolgk/node-mvc) [![Known Vulnerabilities](https://snyk.io/test/github/coolgk/node-mvc/badge.svg)](https://snyk.io/test/github/coolgk/node-mvc)

## Documentation

This framework routes HTTP requests to class methods.

e.g.
**"GET /shop/product/description/1"** calls the **"description"** method in "/modules/**shop**/controllers/**product**.js" (see example code below)

In this example request, **"shop"** is a module (folder), **"product"** is a controller (file), **"description"** is an action (method) and **"1"** is a parameter. The format of the request is **/module/[controller]/[action]/[param]**

The framework looks for files from the folder structure below.

    ./index.js
    ./modules
        /shop
            /controllers
                product.js
                anothercontroller.js
            /models
                model.js
        /anothermodule
            /controllers
            ...

### Controller

The controller module must export a **"default"** property which is a class that extends the base **"Controller"** class from @coolgk/mvc/controller. Folder (module), file (controller) and method (action) names must be in lowercase without special characters except for hyphens and numbers `/[a-z0-9\-]/` or in camelCase if a request contains hyphens e.g. **action-one** is converted to **actionOne**

**product.js** controller example

```javascript
const { Controller } = require('@coolgk/mvc/controller');

class Product extends Controller {
    /**
     * @param {object} dependencies - this param is destructured in this example
     * @param {object} dependencies.params - url param values based on the patterns configured in getRoutes()
     * @param {object} dependencies.globals - the object passed into the router's constructor
     * @param {*} dependencies.services - services returned by getServices()
     */
    description ({ params, services, globals }) {
        // globals contains global dependencies passed into the router class (see example below)
        globals.response.json(
            services.model.find(params.id)
        );
    }

    /**
     * setup valid routes to methods
     */
    getRoutes () {
        return {
            GET: {
                description: ':id' // allow GET request to access the description() method
            }
        }
    }

    /**
     * setup local dependencies
     */
    getServices () {
        return {
            model: new (require('../models/model.js'))()
        };
    }

    /**
     * setup permission callbacks for accessing methods
     */
    getPermissions () {
        return {
            // * the is default permission for all methods in this class
            // can be used for checking app level permissions e.g. login sessions etc.
            '*': () => false, // false = deny all by default
            // true or Promise<true>: skip permission check for the description() method
            'description': () => true
        };
    }
}

exports.default = Product;
```

### Entry Point (Router)

index.js / server.js however you name it...

An example of using express with this framework

```javascript
const express = require('express');
const { Router } = require('@coolgk/mvc/router');

const app = express();

app.use(async (request, response, next) => {

    // initialise router
    const router = new Router({
        rootDir: __dirname, // required
        url: request.originalUrl, // required
        method: request.method, // required
        response // you can pass anything into router, these variables are injected into controllers methods in globals
    });

    // router.route() returns the return value of the controller method if the return value is not falsy
    // otherwise it returns an object formatted by the "response" object (see the documention for @coolgk/mvc/response at the bottom)
    // e.g. { code: 200, text: 'SUCCESS' }, { code: 200, json: {...} }, { code: 200, file: { name: ..., path: ... } } etc.
    const result = (await router.route());

    // for handling 404 / 403 returned from the router
    result && result.code && response.status(result.code).send(result.text);

});

app.listen(3000);
```

### Unit Test

Dependencies are injected into methods, you can easily mock them in your tests.

```javascript
'use strict';

const sinon = require('sinon');
const expect = require('chai').expect;

describe('Test Example', function () {
    // this test is for the example code in https://github.com/coolgk/node-mvc/tree/master/src/examples
    // i.e. not the product.js controller above
    const ControllerClass = require(`../javascript/modules/example/controllers/extended`).default;

    let controller;
    let params;
    let response;
    let services;
    let globals;

    beforeEach(() => {
        // initialise controller for each test case
        controller = new ControllerClass();
        // setup dependencies
        params = { id: 123 };
        // create test spy on global dependency: response
        response = {
            json: sinon.spy()
        };
        // create test stub on local dependency: services
        services = {
            model: {
                getUser: sinon.stub().returns({ name: 'abc' })
            }
        };
        // create test stub on global dependency: globals
        globals = {
            session: {
                getAll: sinon.stub().returns({ session: 'data' })
            }
        };
    });

    it('should show user name and session', async () => {
        await controller.user({ params, response, services, globals });
        expect(services.model.getUser.calledWithExactly(params.id)).to.be.true;
        expect(globals.session.getAll.calledOnce).to.be.true;
        expect(response.json.calledWithExactly({
            user: { name: 'abc' },
            session: { session: 'data' }
        })).to.be.true;
    });

});
```

### More Examples

[JavaScript Examples](https://github.com/coolgk/node-mvc/tree/master/src/examples/javascript)

- A simple app
  - [Entry Point](https://github.com/coolgk/node-mvc/blob/master/src/examples/javascript/index.express.simple.js)
  - [Controller File](https://github.com/coolgk/node-mvc/blob/master/src/examples/javascript/modules/example/controllers/simple.js)
- An example that decouples express from controllers
  - [Entry Point](https://github.com/coolgk/node-mvc/blob/master/src/examples/javascript/index.express.decoupled.js)
  - [Controller File](https://github.com/coolgk/node-mvc/blob/master/src/examples/javascript/modules/example/controllers/decoupled.js)
- An example with session and form data handlers
  - [Entry Point](https://github.com/coolgk/node-mvc/blob/master/src/examples/javascript/index.express.extended.js)
  - [Controller File](https://github.com/coolgk/node-mvc/blob/master/src/examples/javascript/modules/example/controllers/extended.js)
- A native node app without express
  - [Entry Point](https://github.com/coolgk/node-mvc/blob/master/src/examples/javascript/index.native.js)
  - [Controller File](https://github.com/coolgk/node-mvc/blob/master/src/examples/javascript/modules/example/controllers/extended.js)
- An example of using RabbitMQ for managing requests
  - [message pusher](https://github.com/coolgk/node-mvc/blob/master/src/examples/javascript/index.express.rabbitmq.publisher.js)
  - [single task consumer](https://github.com/coolgk/node-mvc/blob/master/src/examples/javascript/index.rabbitmq.consumer.single.task.js)
  - [catch all consumer](https://github.com/coolgk/node-mvc/blob/master/src/examples/javascript/index.rabbitmq.consumer.default.js)
  - [controller](https://github.com/coolgk/node-mvc/blob/master/src/examples/javascript/modules/example/controllers/decoupled.js)

[TypeScript Examples](https://github.com/coolgk/node-mvc/tree/master/src/examples/typescript)
TypeScript version of the examples above


Report bugs here: [https://github.com/coolgk/mongo/issues](https://github.com/coolgk/mongo/issues)


# LIMSML Client

This package contains a JavaScript/TypeScript client library to access the LIMSML web service used by Thermo Fisher Scientific's SampleManager LIMS application.

## Installation

Include this package into your project using NPM:

```
> npm install --save limsml-client
```

## Basic Usage

Start with `Client.login()` to return a promise of a client connection.

```javascript
const LIMSML = require('limsml-client');

LIMSML.Client.login("SYSTEM", "", "http://localhost:56104/wsdl?wsdl")
    .then(client => client.ping({ message: "Hello" }))
    .then(response => {
        console.log(response.system.ping);
    }).catch(reason => {
        console.error(reason);
    });
```

The above can also be rewritten using the `async`/`await` syntax. This makes it easier to make multiple calls to the LIMSML service with the same connection.

```javascript
const LIMSML = require('limsml-client');
    
LIMSML.Client.login("SYSTEM", "", "http://localhost:56104/wsdl?wsdl")
    .then(async client => {

        // make two requests
        let pingResponse = await client.ping({ message: "Hello" });
        let personnelResponse =
            await client.find({ pagesize: 100 }, "personnel");

        // print the responses
        console.log("Ping:", pingResponse.system.ping);
        console.log("Personnel:",
            personnelResponse.data.personnel.table
                .map(r => ({ identity: r.identity, name: r.name })));

        // logout
        await client.logout();

    }).catch(reason => {
        console.error(reason);
    });
```

See [src/demo.ts](src/demo.ts) for some more examples.

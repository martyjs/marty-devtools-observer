#Marty DevTools Observer

Listens to Marty and will emit any changes to a Marty DevTools server.

```js
var Marty = require('marty');
var observe = require('marty-devtools-observer');

observe(Marty, {
    port: 5858, //default,
    serializers: [], //default
    url: 'http://localhost:7070' //default
});
```
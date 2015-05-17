var _ = require('lodash');

var serializers = {
  error: {
    canSerialize: function (obj) {
      return obj instanceof Error;
    },
    serialize: function (obj) {
      return obj.valueOf();
    }
  },
  immutable: {
    canSerialize: function (obj) {
      return !!obj.toJS;
    },
    serialize: function (obj) {
      return obj.toJS();
    }
  }
};

function martyObserver(Marty, options) {
  options = _.defaults(options || {}, {
    url: 'http://localhost:7070/messages',
    port: 5858
  });

  _.each(options.serializers, registerSerializer);

  listenToMarty(Marty);

  function registerSerializer(serializer) {
    if (!serializer.id) {
      throw new Error('Serializer must have an Id');
    }

    if (!serializer.serialize) {
      throw new Error('Serializer must have a `serialize` function');
    }

    if (!serializer.canSerialize) {
      throw new Error('Serializer must have a `canSerialize` function');
    }

    serializers[serializer.id] = serializer;
  }

  function listenToMarty(Marty) {
    if (Marty.Application && Marty.Application.__getCurrentApplication) {
      Marty.Application.__getCurrentApplication(function (app) {
        observeDispatcher(app.dispatcher, app.dehydrate.bind(app));
      });
    }

    function observeDispatcher(dispatcher, dehydrate) {
      postMessage('PAGE_LOADED', {
        martyFound: true,
        stores: dehydrate().toJSON()
      });

      dispatcher.onActionDispatched(function (action) {
        postMessage('RECEIVE_DISPATCH', {
          id: action.id,
          action: action.toJSON(),
          stores: dehydrate().toJSON()
        });
      });
    }
  }

  function serialize(obj) {
    var result;
    var serialized = false;

    _.each(serializers, function (serializer, id) {
      try {
        if (serializer.canSerialize(obj)) {
          result = serializer.serializer(obj);
          serialized = true;
        }
      } catch (e) {
        console.error('The', id, 'serializer failed to serialize', obj, e);
      }
    });

    if (!serialized) {
      result = defaultSerializer(obj);
    }

    return result;
  }

  function defaultSerializer(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function postMessage(type, payload) {
    var body;

    try {
      body = JSON.stringify(message(type, payload));
    } catch (e) {
      console.error('failed to serialize payload', e);
    }

    try {
      var url = options.url + '?port=' + options.port;

      fetch(url, {
        body: body,
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
    } catch (e) {
      console.error('failed to post message', e);
    }
  }

  function message(type, payload) {
    return {
      type: type,
      payload: payload ? serialize(payload) : {}
    };
  }
}

module.exports = martyObserver;
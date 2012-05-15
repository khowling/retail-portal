/*!
 * connect-mongo
 * Copyright(c) 2011 Casey Banner <kcbanner@gmail.com>
 * MIT Licensed
 */

/**
 * Module dependencies
 */


/**
 * Default options
 */

var defaultOptions = {host: '127.0.0.1',
                      port: 27017,
                      stringify: true,
                      collection: 'sessions',
                      auto_reconnect: false,
                      clear_interval: -1};

module.exports = function(connect) {
  var Store = connect.session.Store;

  /**
   * Initialize MongoStore with the given `options`.
   * Calls `callback` when db connection is ready (mainly for testing purposes).
   * 
   * @param {Object} options
   * @param {Function} callback
   * @api public
   */

  function MongoStore(db) {
    console.log ('called MongoStore');
    this.db = db;
    
    this.db_collection_name =  defaultOptions.collection;

    if (defaultOptions.hasOwnProperty('stringify') ? defaultOptions.stringify : defaultOptions.stringify) {
      this._serialize_session = JSON.stringify;
      this._unserialize_session = JSON.parse;
    } else {
      this._serialize_session = function(x) { return x; };
      this._unserialize_session = function(x) { return x; };
    }
    
    var self = this;
    this._get_collection = function(callback) {
        console.log ('called _get_collection');
        if (self.collection) {
            callback && callback(self.collection);
        } else {
            self.db.collection(self.db_collection_name, function(err, collection) {
              if (err) {
                throw new Error('Error getting collection: ' + self.db_collection_name);
              } else {
                  console.log ('called _get_collection + got collection');
                self.collection = collection;
                    
                var clear_interval = defaultOptions.clear_interval;
                if (clear_interval > 0) {
                  self.clear_interval = setInterval(function() {          
                    self.collection.remove({expires: {$lte: new Date()}});
                  }, clear_interval * 1000, self);
                }
                
                callback && callback(self.collection);
              }      
            });    
      }
    };
    
    self._get_collection();
    
  };

  /**
   * Inherit from `Store`.
   */

  MongoStore.prototype.__proto__ = Store.prototype;

  /**
   * Attempt to fetch session by the given `sid`.
   *
   * @param {String} sid
   * @param {Function} callback
   * @api public
   */
  
  MongoStore.prototype.get = function(sid, callback) {
    var self = this;
    this._get_collection(function(collection) {    
      collection.findOne({_id: sid}, function(err, session) {
        try {
          if (err) {
            callback && callback(err, null);
          } else {      
            
            if (session) {
              if (!session.expires || new Date < session.expires) {
                callback(null, self._unserialize_session(session.session));
              } else {
                self.destroy(sid, callback);
              }
            } else {
              callback && callback();
            }
          }
        } catch (err) {
          callback && callback(err);
        }
      });
    });
  };

  /**
   * Commit the given `sess` object associated with the given `sid`.
   *
   * @param {String} sid
   * @param {Session} sess
   * @param {Function} callback
   * @api public
   */

  MongoStore.prototype.set = function(sid, session, callback) {
    try {
          var s = {_id: sid, session: this._serialize_session(session)};

      if (session && session.cookie && session.cookie._expires) {
        s.expires = new Date(session.cookie._expires);
      }

      this._get_collection(function(collection) {
        collection.update({_id: sid}, s, {upsert: true, safe: true}, function(err, data) {
          if (err) {
            callback && callback(err);
          } else {
            callback && callback(null);
          }
        });
      });
    } catch (err) {
      callback && callback(err);
    }
  };

  /**
   * Destroy the session associated with the given `sid`.
   *
   * @param {String} sid
   * @param {Function} callback
   * @api public
   */

  MongoStore.prototype.destroy = function(sid, callback) {
    this._get_collection(function(collection) {
      collection.remove({_id: sid}, function() {
        callback && callback();
      });
    });
  };

  /**
   * Fetch number of sessions.
   *
   * @param {Function} callback
   * @api public
   */

  MongoStore.prototype.length = function(callback) {
    this._get_collection(function(collection) {
      collection.count({}, function(err, count) {
        if (err) {
          callback && callback(err);
        } else {
          callback && callback(null, count);
        }
      });
    });
  };

  /**
   * Clear all sessions.
   *
   * @param {Function} callback
   * @api public
   */

  MongoStore.prototype.clear = function(callback) {
    this._get_collection(function(collection) {
      collection.drop(function() {
        callback && callback();
      });
    });
  };
  
  return MongoStore;
};
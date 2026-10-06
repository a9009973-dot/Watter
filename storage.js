/* PWA persistent storage bridge */
(function () {
  "use strict";
  var DB = "watar-pwa-storage";
  var STORE = "localStorageBackup";
  var KEY = "snapshot";

  function openDB() {
    return new Promise(function (resolve, reject) {
      var r = indexedDB.open(DB, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(STORE); };
      r.onsuccess = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
    });
  }

  function readBackup() {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readonly"), req = tx.objectStore(STORE).get(KEY);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function writeBackup(data) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(data, KEY);
        tx.oncomplete = resolve;
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function snapshot() {
    var data = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        data[k] = localStorage.getItem(k);
      }
    } catch (e) {}
    return data;
  }

  function restore(data) {
    if (!data) return false;
    try {
      Object.keys(data).forEach(function (k) { localStorage.setItem(k, data[k]); });
      return Object.keys(data).length > 0;
    } catch (e) { return false; }
  }

  function run() {
    var persist = navigator.storage && navigator.storage.persist ? navigator.storage.persist() : Promise.resolve(false);
    Promise.all([persist.catch(function(){return false;}), readBackup().catch(function(){return null;})])
      .then(function (parts) {
        var backup = parts[1], current = snapshot();
        if ((!current.mp2 || current.mp2 === "{}") && backup && backup.mp2) {
          if (restore(backup)) {
            location.reload();
            return;
          }
        }
        return writeBackup(current);
      })
      .catch(function(){});
  }

  window.addEventListener("beforeunload", function () {
    try { writeBackup(snapshot()); } catch (e) {}
  });
  run();
  setInterval(function () { writeBackup(snapshot()).catch(function(){}); }, 15000);
})();

"use strict";

var express = require("express");
var http = require("http");
var nodegit = require("nodegit");
var socketio = require("socket.io");

var app = express();
app.use(express.static(__dirname + "/static"));

var server = http.Server(app);
server.listen(5678);

var io = socketio(server);
io
  .of("git")
  .on("connection", function (socket) {
    console.log("connected");
    socket.on("revision", function (repo_path) {
      console.log(repo_path);
      nodegit.Repository
        .open(repo_path)
        .then(function(repository) {
          console.log("Load repository", repository.path());
          return repository.getMasterCommit();
        })
        .then(function(rootCommit) {
          var walker = rootCommit.history(nodegit.Revwalk.SORT.TOPOLOGICAL);
          walker
            .on("commit", function(commit) {
              console.log("commit", commit.sha());
              socket.emit("commit", {
                id: commit.id().tostrS(),
                parents: commit.parents().map(function(oid) {
                  return oid.tostrS();
                })
              });
            })
            .on("end", function() {
              console.log("end");
              socket.emit("end");
            });
          walker.start();
        })
        .catch(function(error) {
          console.error(error);
          socket.disconnect();
        });
    });
  });

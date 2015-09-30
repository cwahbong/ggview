"use strict";

var io = require("socket.io-client");
var d3 = require("d3");

var width = 800;
var height = 800;

var svg = d3.select("#ggview-svg")
  .attr("width", width)
  .attr("height", height);
svg.append("g")
  .attr("class", "links");
svg.append("g")
  .attr("class", "nodes");
svg.append("g")
  .attr("class", "labels");

var children = {};
var node_map = {};
var nodes = [];
var links = [];

var node;
var link;
var label;

var force = d3.layout.force()
  .size([width, height])
  .charge(-80)
  .alpha(0)
  .linkDistance(100)
  .gravity(0.03)
  .on("tick", function() {
    node
      .attr('cx', function(d) { return d.x; })
      .attr('cy', function(d) { return d.y; });

    link
      .attr('x1', function(d) { return d.source.x; })
      .attr('y1', function(d) { return d.source.y; })
      .attr('x2', function(d) { return d.target.x; })
      .attr('y2', function(d) { return d.target.y; });

    label
      .attr('x', function(d) { return d.x; })
      .attr('y', function(d) { return d.y; });
  });

var update = function() {
  link = svg.select(".links").selectAll(".link").data(links);
  link.enter().append("line")
          .attr("class", "link")
          .attr("commit-parent", function(d) { return d.target; })
          .attr("commit-child", function(d) { return d.source; });
  link.exit().remove();

  node = svg.select(".nodes").selectAll(".node").data(nodes);
  node.enter().append("circle")
          .attr("class", "node")
          .attr("r", 20)
          .attr("fill", "yellow")
          .attr("commit-id", function(d) { return d.id; })
          .call(force.drag);
  node.attr("r", function(d) { return 20 * (1 + Math.log(d.commits.length) / Math.log(100)); })
  node.exit().remove();

  label = svg.select(".labels").selectAll(".label").data(nodes);
  label.enter().append("text")
          .attr("class", "label");
  label.text(function(d) { console.log(d); return d.commits.length; });
  label.exit().remove();
};

var socket_commit = function(socket, commit) {
  if (children[commit.id] === undefined) {
    children[commit.id] = [];
  }
  if (children[commit.id].length != 1) {
    var node = {commits: [commit], end: false, idx: nodes.length};
    nodes.push(node);
    node_map[commit.id] = node;
    for (var idx in commit.parents) {
      var parentId = commit.parents[idx];
      if (parentId == commit.id) {
        continue;
      }
      if (children[parentId] === undefined) {
        children[parentId] = [];
      }
      children[parentId].push(commit.id);
    }
    for (var idx in children[commit.id]) {
      var childId = children[commit.id][idx];
      node_map[childId].end = true;
      links.push({target: node.idx, source: node_map[childId].idx});
      console.log("Pushed a link.");
    }
  } else {
    var childId = children[commit.id][0];
    if (node_map[childId].end === true) {
      var node = {commits: [commit], end: false, idx: nodes.length};
      nodes.push(node);
      node_map[commit.id] = node;
      links.push({target: node.idx, source: node_map[childId].idx});
      console.log("Pushed a link.");
    } else { // Merge to child node
      node_map[commit.id] = node_map[childId];
      node_map[childId].commits.push(commit)
      if (commit.parents.length > 1) {
        node_map[childId].end = true;
      }
      console.log("Merged a commit.");
    }
    for (var idx in commit.parents) {
      var parentId = commit.parents[idx];
      if (children[parentId] === undefined) {
        children[parentId] = [];
      }
      if (parentId == commit.id) {
        continue;
      }
      children[parentId].push(commit.id);
    }
  }
  // console.log("commit", commit);
  update();
  force.nodes(nodes).links(links).start();
};

var socket_end = function(socket) {
  console.info("end");
  update();
  force.nodes(nodes).links(links).start();
  socket.disconnect();
  // console.log(nodes);
  // console.log(links);
};

var ggview = {
  start: function(host, repo_path) {
    var socket = io(host, {"force new connection": true});

    children = {};
    node_map = {};
    nodes = [];
    links = [];

    socket
      .on("connect", function() {
        socket.emit("revision", repo_path);
      })
      .on("commit", function(commit) {
        socket_commit(socket, commit);
      })
      .on("end", function() {
        socket_end(socket);
      });
  },
};

var startButton = document.getElementById("start");
startButton.onclick = function() {
  ggview.start('http://localhost:5678/git', document.getElementById("repo_path").value);
}

module.exports = ggview

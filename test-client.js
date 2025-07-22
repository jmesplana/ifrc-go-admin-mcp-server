#!/usr/bin/env node

const { spawn } = require('child_process');

// Start the MCP server
const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

// MCP protocol messages
const initializeMsg = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' }
  }
};

const listToolsMsg = {
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/list',
  params: {}
};

const callToolMsg = {
  jsonrpc: '2.0',
  id: 3,
  method: 'tools/call',
  params: {
    name: 'get_dref_statistics',
    arguments: {}
  }
};

// Send messages
function sendMessage(msg) {
  server.stdin.write(JSON.stringify(msg) + '\n');
}

// Handle responses
server.stdout.on('data', (data) => {
  console.log('Response:', data.toString());
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

// Test sequence
setTimeout(() => {
  console.log('Sending initialize...');
  sendMessage(initializeMsg);
}, 1000);

setTimeout(() => {
  console.log('Sending list tools...');
  sendMessage(listToolsMsg);
}, 2000);

setTimeout(() => {
  console.log('Sending call tool...');
  sendMessage(callToolMsg);
}, 3000);

setTimeout(() => {
  server.kill();
}, 5000);
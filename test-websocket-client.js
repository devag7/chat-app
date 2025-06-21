import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3000/api/ws');

ws.on('open', function open() {
  console.log('WebSocket connected successfully!');
  
  // Test authentication with a real user ID from our database
  ws.send(JSON.stringify({
    type: 'auth',
    userId: '6856624e52445b34d0934f3e' // Real user ID from testlogin user
  }));
  
  // Test message after auth
  setTimeout(() => {
    ws.send(JSON.stringify({
      type: 'message',
      chatRoom: 'test-room',
      content: 'Hello WebSocket!'
    }));
  }, 1000);
});

ws.on('message', function message(data) {
  console.log('Received:', data.toString());
});

ws.on('close', function close() {
  console.log('WebSocket connection closed');
});

ws.on('error', function error(err) {
  console.error('WebSocket error:', err);
});

// Keep alive for 5 seconds
setTimeout(() => {
  ws.close();
  process.exit(0);
}, 5000);

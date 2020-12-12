#!/usr/bin/env node

const { v4: uuidv4 } = require('uuid');
const amqp = require('amqplib/callback_api');

amqp.connect('amqp://localhost', function(error0, connection) {
  if (error0) {
    throw error0;
  }
  connection.createChannel(function(error1, channel) {
    if (error1) {
      throw error1;
    }
    channel.assertQueue('', {
      exclusive: true
    }, function(error2, q) {
      if (error2) {
        throw error2;
      }
      var correlationId = generateUuid();

      console.log(' [x] Requesting Ad...');

      channel.consume(q.queue, function(msg) {
        if (msg.properties.correlationId == correlationId) {
            console.log(' [o] Sending message to queue %s', q.queue);
            console.log(' [.] Correlation ID: %s', msg.properties.correlationId.toString());
            console.log(' [.] Got data: %s', msg.content.toString());
            
            setTimeout(function() {
                connection.close();
                process.exit(0)
          }, 500);
        }
      }, {
        noAck: true
      });

      channel.sendToQueue('rpc_queue',
        Buffer.from('getAd'), {
            correlationId: correlationId,
            type: "service.request",
            replyTo: q.queue });
    });
  });
});

function generateUuid() {
    return uuidv4();
}
#!/usr/bin/env node

const amqp = require('amqplib/callback_api');
const fs = require('fs');
const open = require('open');

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
            console.log(' [.] Got %s', msg.content.toString());

            fs.writeFile('page.html', msg.content.toString(), function(err) {
                if (err) {
                    return console.log(err);
                }
            });
            
            open('page.html', {'wait': true});
            
            setTimeout(function() {
                connection.close();
                process.exit(0)
          }, 500);
        }
      }, {
        noAck: true
      });

      channel.sendToQueue('rpc_queue',
        Buffer.from('getAd'),{ 
          correlationId: correlationId, 
          replyTo: q.queue });
    });
  });
});

function generateUuid() {
    return Math.random().toString() +
           Math.random().toString() +
           Math.random().toString();
}
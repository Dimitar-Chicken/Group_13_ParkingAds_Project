#!/usr/bin/env node

const amqp = require('amqplib/callback_api');
const axios = require('axios');

amqp.connect('amqp://localhost', function(error0, connection) {
  if (error0) {
    throw error0;
  }
  connection.createChannel(function(error1, channel) {
    if (error1) {
      throw error1;
    }
    var queue = 'rpc_queue';

    channel.assertQueue(queue, {
      durable: false
    });
    channel.prefetch(1);
    console.log(' [x] Awaiting RPC requests');
    channel.consume(queue, function reply(msg) {
        if(msg.content.toString() == 'getAd' && msg.properties.type == "service.request") {
            axios.get('http://psuaddservice.fenris.ucn.dk/').then(response => {
                console.log(' [.] Sending %s', response.data);
                channel.sendToQueue(msg.properties.replyTo, Buffer.from(response.data), {
                    correlationId: msg.properties.correlationId
                });
            }).catch(error => {
                console.log(error);
            });
        }
        channel.ack(msg);
    });
  });
});

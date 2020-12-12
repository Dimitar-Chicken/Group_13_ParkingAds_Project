#!/usr/bin/env node

const amqp = require('amqplib');
const axios = require('axios').default;

const queue = 'main-queue';
const parkingApiUrl = 'http://psuaddservice.fenris.ucn.dk/';
const rabbitMqConnectionAddress = 'amqp://localhost';
let rabbitMqConnection = undefined;

amqp.connect(rabbitMqConnectionAddress)
    .then((conn) => {
        rabbitMqConnection = conn;
        return conn.createChannel();
    })
    .then((ch) => {
        return ch.assertQueue(queue, {durable: false}).then((q) => {
            //Allowing the channel to accept up to 1 extra message before the previous one has been acknowledged.
            ch.prefetch(1);
            
            console.log(' [x] Awaiting RPC requests...');
            //Consuming the next queue msg and processing it.
            return ch.consume(queue, (msg) => {
                //Verifying message contents and type.
                if(msg.properties.type == "adService.request") {
                    //Acknowledging the message as valid.
                    ch.ack(msg);
                    axios.get(parkingApiUrl)
                        .then(response => {
                            console.log(' [o] Sending message to queue: %s', queue);
                            console.log(' [.] Correlation ID: %s', msg.properties.correlationId.toString());
                            console.log(' [.] Sending data: %s', response.data);
            
                            //Sending the message reply to the given replyTo message property along with the correlationId.
                            ch.sendToQueue(msg.properties.replyTo, Buffer.from(response.data), {
                                correlationId: msg.properties.correlationId
                            });
                        })
                        .catch((err) => {
                            console.log(err);
                        });
                }
            });
        }, {
            noAck: true
        });
    })
    .catch((err) => {
        console.log(err);
    });

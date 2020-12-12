#!/usr/bin/env node

const { v4: uuidv4 } = require('uuid');
const amqp = require('amqplib');

const queue = 'main-queue';
const rabbitMqConnectionAddress = 'amqp://localhost';
let rabbitMqConnection = undefined;

amqp.connect(rabbitMqConnectionAddress)
    .then((conn) => {
        rabbitMqConnection = conn;
        return conn.createChannel();
    })
    .then((ch) => {
        ch.assertQueue('', {exclusive: true})
            .then((q) => {
                //Generating a UUID to use a message correlation ID.
                var correlationId = generateUuid();

                console.log(' [x] Requesting Ad...');
                ch.consume(q.queue, (msg) => {
                    if (msg.properties.correlationId == correlationId) {
                        //Acknowledging the message as valid.
                        ch.ack(msg);

                        console.log(' [o] Sending message to queue: %s', q.queue);
                        console.log(' [.] Correlation ID: %s', msg.properties.correlationId.toString());
                        console.log(' [.] Got data: %s', msg.content.toString());
                        
                        setTimeout(function() {
                            rabbitMqConnection.close();
                            process.exit(0);
                    }, 500);
                    }
                });

                return ch.sendToQueue(queue,
                    '',
                    {
                        correlationId: correlationId,
                        type: "adService.request",
                        replyTo: q.queue
                    });
            }, {
                noAck: true
            });
    })
    .catch((err) => {
        console.log(err);
    });

function generateUuid() {
    return uuidv4();
}
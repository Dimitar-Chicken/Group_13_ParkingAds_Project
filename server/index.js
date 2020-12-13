//ExpressJS
const express = require('express');
const app = express();
const SERVER_PORT = 3000;

//AdService
const { v4: uuidv4 } = require('uuid');
const amqp = require('amqplib');

//redis cache
const redis = require("redis");
const REDIS_PORT = 6379;
const redisClient = redis.createClient(REDIS_PORT);

//node-cron
const cron = require('node-cron');

app.get('/ad', (req, res) => {
    redisClient.get('ad', (err, cachedData) => {
        res.send(cachedData);
    });
});

app.listen(SERVER_PORT, () => {
    console.log(' [x] Listening to port: %s', SERVER_PORT);
});

//Scheduling Ad caching.
cron.schedule('*/2 * * * * *', () => {
    console.log(' [o] Caching Ad.');
    queryAdService();
});

function queryAdService() {
    const queue = 'main-queue';
    const rabbitMqConnectionAddress = 'amqp://localhost';
    let rabbitMqConnection = undefined;

    //Opening a RabbitMQ connection
    amqp.connect(rabbitMqConnectionAddress)
    .then((conn) => {
        rabbitMqConnection = conn;
        //Creating a Channel on the connection to send/receive data.
        return conn.createChannel();
    })
    .then((ch) => {
        //Creating a Message Queue on the Channel.
        ch.assertQueue('', {
            exclusive: true,
            arguments: {
                "x-message-ttl" : 30000
            }
        })
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
                        console.log(' [ ]');
                        
                        var messageContent = msg.content.toString();
                        //Caching result.
                        if (!messageContent.toLowerCase().includes('Something bad happened, Sorry.'.toLowerCase())) {
                            redisClient.setex('ad', 3000, messageContent);
                        }

                        //Closing the RabbitMQ connection after the content is returned.
                        setTimeout(function() {
                            rabbitMqConnection.close();
                    }, 500);
                    }
                });

                //Sending a request for an Ad.
                ch.sendToQueue(queue,
                    Buffer.from(''),
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
}

function generateUuid() {
    return uuidv4();
}
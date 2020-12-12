const axios = require('axios').default;
const amqplib = require('amqplib');

const queue = 'main-queue';
const parkingApiUrl = 'http://psuparkingservice.fenris.ucn.dk/service';
let rabbitMqConnection = undefined;


amqplib.connect('amqp://localhost')
    .then((conn) => {
        rabbitMqConnection = conn;
        return conn.createChannel();
    })
    .then((ch) => {
        return ch.assertQueue(queue).then((ok) => {
            return ch.sendToQueue(queue, Buffer.from('Hello world!'));
        });
    })
    .catch((err) => {
        console.log(err);
    })
    .finally(() => {
        console.log('Close connection');
        rabbitMqConnection.close();
    });

/*
axios.get(parkingApiUrl)
    .then((response) => {
        const { data } = response;

        console.log(data);
    })
    .catch((error) => {
        console.log('Got error');
        console.log(error.response.status);
    });
*/
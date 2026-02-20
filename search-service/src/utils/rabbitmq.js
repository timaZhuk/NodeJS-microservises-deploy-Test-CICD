const amqp = require("amqplib");
const logger = require("./logger.js");

let connection = null;
let channel = null;

const EXCHANGE_NAME = "facebook_events";

async function connectToRabbitMQ() {
  try {
    //connect to the RabbitMQ server
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    //creating channel for communication
    channel = await connection.createChannel();
    //--is a central hub in RabbitMQ, receives messages from producer and sends to more queues
    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: false });
    logger.info("Connected to RabbitMQ");
    return channel;
  } catch (error) {
    logger.error("Error connection to RabbitMQ: ", error);
  }
}

//---publishing events------SEARCH SERVICE------
async function publishEvent(routingKey, message) {
  if (!channel) {
    await connectToRabbitMQ();
  }

  channel.publish(
    EXCHANGE_NAME,
    routingKey,
    Buffer.from(JSON.stringify(message)),
  );
  logger.info(`Event published: ${routingKey}`);
}

//SEARCH SERVICE
//Consume event from other service,
async function consumeEvent(routingKey, callback) {
  if (!channel) {
    await connectToRabbitMQ();
  }

  //queue
  //"" means random name from rabbitmq
  //scopes the queues for connections
  const q = await channel.assertQueue("", { exclusive: true });
  //bind all together (queue, exchanger, routing_pattern)
  await channel.bindQueue(q.queue, EXCHANGE_NAME, routingKey);

  //consume
  channel.consume(q.queue, (msg) => {
    if (msg !== null) {
      const content = JSON.parse(msg.content.toString());
      callback(content);
      channel.ack(msg);
    }
  });
  logger.info(`Subscribed to event: ${routingKey}`);
}

//--
module.exports = { connectToRabbitMQ, publishEvent, consumeEvent };

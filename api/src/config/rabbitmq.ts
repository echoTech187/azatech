import amqplib, { Channel, ChannelModel } from 'amqplib';
import { env } from './env';
import { logger } from './logger';

export const EXCHANGE_NAME = 'shop.events';
export const DLX_EXCHANGE_NAME = 'shop.dlx';
export const QUEUE_INVOICE_PAID = 'q.invoice.paid';
export const QUEUE_STOCK_LOW = 'q.stock.low';
export const QUEUE_DLQ = 'q.dlq';

class RabbitMQClient {
    private connection: ChannelModel | null = null;
    private channel: Channel | null = null;

    async getChannel(): Promise<Channel> {
        if (this.channel) return this.channel;

        this.connection = await amqplib.connect(env.RABBITMQ_URL);
        this.channel = await this.connection.createChannel();

        await this.channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
        await this.channel.assertExchange(DLX_EXCHANGE_NAME, 'topic', { durable: true });

        await this.channel.assertQueue(QUEUE_DLQ, { durable: true });
        await this.channel.bindQueue(QUEUE_DLQ, DLX_EXCHANGE_NAME, '#');

        await this.channel.assertQueue(QUEUE_INVOICE_PAID, {
            durable: true,
            deadLetterExchange: DLX_EXCHANGE_NAME,
            deadLetterRoutingKey: 'dlq.invoice.paid',
        });
        await this.channel.bindQueue(QUEUE_INVOICE_PAID, EXCHANGE_NAME, 'order.paid');

        await this.channel.assertQueue(QUEUE_STOCK_LOW, {
            durable: true,
            deadLetterExchange: DLX_EXCHANGE_NAME,
            deadLetterRoutingKey: 'dlq.stock.low',
        });
        await this.channel.bindQueue(QUEUE_STOCK_LOW, EXCHANGE_NAME, 'stock.low');

        return this.channel;
    }

    async publish(routingKey: string, payload: unknown): Promise<void> {
        try {
            const ch = await this.getChannel();
            ch.publish(
                EXCHANGE_NAME,
                routingKey,
                Buffer.from(JSON.stringify(payload)),
                { persistent: true, contentType: 'application/json' }
            );
        } catch (err) {
            logger.error({ err, routingKey }, 'Failed to publish message to RabbitMQ');
        }
    }

    async checkHealth(): Promise<boolean> {
        try {
            const ch = await this.getChannel();
            return ch !== null;
        } catch {
            return false;
        }
    }
}

export const rabbitMQ = new RabbitMQClient();
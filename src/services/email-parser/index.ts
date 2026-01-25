import { S3Event, Context } from 'aws-lambda';
import { SimpleParser } from 'mailparser';
import * as AWS from 'aws-sdk';

const s3 = new AWS.S3();

export const handler = async (event: S3Event, context: Context) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    try {
      // 1. Fetch email from S3
      const params = { Bucket: bucket, Key: key };
      const data = await s3.getObject(params).promise();
      
      if (!data.Body) {
        throw new Error('Email body is empty');
      }

      // 2. Parse Email
      const parsed = await SimpleParser(data.Body as Buffer);
      
      console.log('Subject:', parsed.subject);
      console.log('From:', parsed.from?.text);
      console.log('Text Body:', parsed.text);

      // TODO: Extract Lead Data (Regex for ImmoScout/Willhaben)
      // TODO: Save to DB
      
    } catch (error) {
      console.error('Error processing email:', error);
      throw error;
    }
  }
};

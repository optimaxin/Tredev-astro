// Sends OTP texts via Amazon SNS. Unlike geocoding.ts's AWS Location call
// (a simple API-key query param), SNS's Publish action requires a real
// SigV4-signed request — there's no lightweight REST-call alternative, so
// this uses the AWS SDK. Credentials come from the SDK's default provider
// chain (AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY env vars), matching the
// "nothing reads process.env directly outside config.ts" convention in
// spirit — the SDK itself does that reading, not this file.
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { config } from '../core/config.ts';

const sns = new SNSClient({ region: config.aws.snsRegion });

export async function sendSms(phoneNumber: string, message: string): Promise<void> {
  await sns.send(new PublishCommand({ PhoneNumber: phoneNumber, Message: message }));
}

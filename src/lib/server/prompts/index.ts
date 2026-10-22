import {
	BEDROCK_AWS_ACCESS_KEY_ID,
	BEDROCK_AWS_REGION,
	BEDROCK_AWS_SECRET_ACCESS_KEY,
	BEDROCK_MODEL
} from '$app/env/private';
import { createPromptClient } from './generate';

/** The configured Bedrock prompt client, or null when AWS credentials are not set. */
export const promptClient = createPromptClient({
	accessKeyId: BEDROCK_AWS_ACCESS_KEY_ID,
	secretAccessKey: BEDROCK_AWS_SECRET_ACCESS_KEY,
	region: BEDROCK_AWS_REGION,
	model: BEDROCK_MODEL
});

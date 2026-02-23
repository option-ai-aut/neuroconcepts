"use strict";
/**
 * Email Parser Lambda
 *
 * Receives emails from AWS SES via S3 and forwards them to the Orchestrator
 * for processing by Mivo (AI-based parsing).
 *
 * This Lambda no longer does any parsing itself - it just extracts the raw
 * email data and sends it to /internal/ingest-lead.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const mailparser_1 = require("mailparser");
const AWS = __importStar(require("aws-sdk"));
const axios_1 = __importDefault(require("axios"));
const s3 = new AWS.S3();
let secretsLoaded = false;
async function loadSecrets() {
    if (secretsLoaded)
        return;
    secretsLoaded = true;
    const arn = process.env.APP_SECRET_ARN;
    if (!arn || !process.env.AWS_LAMBDA_FUNCTION_NAME)
        return;
    try {
        const sm = new AWS.SecretsManager();
        const secret = await sm.getSecretValue({ SecretId: arn }).promise();
        if (secret.SecretString) {
            const parsed = JSON.parse(secret.SecretString);
            if (parsed.INTERNAL_API_SECRET)
                process.env.INTERNAL_API_SECRET = parsed.INTERNAL_API_SECRET;
        }
    }
    catch (e) {
        console.error('Failed to load secrets:', e);
    }
}
const handler = async (event, context) => {
    console.log('📧 Email Parser Lambda triggered');
    console.log('Event:', JSON.stringify(event, null, 2));
    await loadSecrets();
    const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_API_URL || 'http://localhost:3001';
    const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;
    // LOCAL TEST MODE
    if (event.isLocal) {
        console.log('Running in LOCAL test mode');
        await processEmail({
            to: event.to || 'test@leads.immivo.ai',
            from: event.from || 'noreply@immobilienscout24.de',
            subject: event.subject || 'Test Subject',
            text: event.body || event.text || '',
            html: event.html,
            orchestratorUrl: ORCHESTRATOR_URL,
        });
        return { success: true };
    }
    // Process S3 events (from SES)
    for (const record of event.Records) {
        const bucket = record.s3.bucket.name;
        const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
        try {
            console.log(`📥 Fetching email from S3: ${bucket}/${key}`);
            // 1. Fetch email from S3
            const params = { Bucket: bucket, Key: key };
            const data = await s3.getObject(params).promise();
            if (!data.Body) {
                throw new Error('Email body is empty');
            }
            // 2. Parse raw email with mailparser
            const parsed = await (0, mailparser_1.simpleParser)(data.Body);
            // 3. Extract all relevant fields including TO (recipient)
            const to = extractRecipient(parsed);
            const from = parsed.from?.text || parsed.from?.value?.[0]?.address || '';
            const subject = parsed.subject || '';
            const text = parsed.text || '';
            const html = typeof parsed.html === 'string' ? parsed.html : undefined;
            console.log(`📧 Email details:`);
            console.log(`   To: ${to}`);
            console.log(`   From: ${from}`);
            console.log(`   Subject: ${subject}`);
            // 4. Send to Orchestrator for Mivo processing
            await processEmail({
                to,
                from,
                subject,
                text,
                html,
                orchestratorUrl: ORCHESTRATOR_URL,
                rawEmailKey: key, // Reference to original email in S3
            });
        }
        catch (error) {
            console.error('❌ Error processing email:', error);
        }
    }
    return { success: true };
};
exports.handler = handler;
/**
 * Extract recipient email address from parsed email
 */
function extractRecipient(parsed) {
    // Try different fields where recipient might be
    if (parsed.to?.value?.[0]?.address) {
        return parsed.to.value[0].address;
    }
    if (parsed.to?.text) {
        // Extract email from text like "Name <email@example.com>"
        const match = parsed.to.text.match(/<([^>]+)>/) || parsed.to.text.match(/([^\s<]+@[^\s>]+)/);
        if (match)
            return match[1];
        return parsed.to.text;
    }
    // Check envelope recipient (for SES)
    if (parsed.headers?.get('x-original-to')) {
        return parsed.headers.get('x-original-to');
    }
    if (parsed.headers?.get('delivered-to')) {
        return parsed.headers.get('delivered-to');
    }
    return '';
}
/**
 * Send email data to Orchestrator for processing.
 * Tries primary URL first; on 404 (tenant not found) falls back to FALLBACK_ORCHESTRATOR_URL.
 */
async function processEmail(params) {
    const { to, from, subject, text, html, orchestratorUrl, rawEmailKey } = params;
    const fallbackUrl = process.env.FALLBACK_ORCHESTRATOR_URL;
    const payload = { recipientEmail: to, from, subject, text, html, rawEmailKey };
    const headers = {
        'Content-Type': 'application/json',
        ...(process.env.INTERNAL_API_SECRET ? { 'X-Internal-Secret': process.env.INTERNAL_API_SECRET } : {}),
    };
    const tryOrchestrator = async (url, label) => {
        const baseUrl = url.replace(/\/+$/, '');
        console.log(`📤 Sending to ${label}: ${baseUrl}/internal/ingest-lead`);
        const response = await axios_1.default.post(`${baseUrl}/internal/ingest-lead`, payload, { timeout: 30000, headers });
        console.log(`✅ ${label} response:`, JSON.stringify(response.data, null, 2));
        return response.data;
    };
    try {
        return await tryOrchestrator(orchestratorUrl, 'Orchestrator');
    }
    catch (error) {
        const status = error.response?.status;
        // 404 = tenant not found in this env → try fallback (e.g. test env)
        if ((status === 404 || status === 400) && fallbackUrl) {
            console.log(`⚠️ Tenant not found in primary (${status}), trying fallback orchestrator...`);
            try {
                return await tryOrchestrator(fallbackUrl, 'Fallback Orchestrator');
            }
            catch (fallbackError) {
                console.error('❌ Fallback orchestrator also failed:', fallbackError.message);
                if (fallbackError.response) {
                    console.error('Fallback status:', fallbackError.response.status);
                    console.error('Fallback data:', fallbackError.response.data);
                }
                throw fallbackError;
            }
        }
        console.error('❌ Failed to send to Orchestrator:', error.message);
        if (error.response) {
            console.error('Response status:', status);
            console.error('Response data:', error.response.data);
        }
        throw error;
    }
}

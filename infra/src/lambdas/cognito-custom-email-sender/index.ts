/**
 * Cognito Custom Email Sender Lambda
 * 
 * Replaces Cognito's default email delivery entirely.
 * Cognito encrypts the verification code with KMS → this Lambda decrypts it → 
 * builds a branded HTML email → sends via Resend.
 */

import { buildClient, CommitmentPolicy, KmsKeyringNode } from '@aws-crypto/client-node';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Resend } from 'resend';

// --- KMS Decryption ---
const { decrypt } = buildClient(CommitmentPolicy.REQUIRE_ENCRYPT_ALLOW_DECRYPT);
const keyArn = process.env.KEY_ARN!;
const keyring = new KmsKeyringNode({ keyIds: [keyArn] });

// --- Resend Client (lazy, cached across invocations) ---
const smClient = new SecretsManagerClient({});
let resendInstance: Resend | null = null;

async function getResend(): Promise<Resend> {
  if (resendInstance) return resendInstance;
  const result = await smClient.send(
    new GetSecretValueCommand({ SecretId: process.env.APP_SECRET_ARN })
  );
  const secrets = JSON.parse(result.SecretString || '{}');
  resendInstance = new Resend(secrets.RESEND_API_KEY);
  return resendInstance;
}

// ============================================================
// HTML Email Components
// ============================================================

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const MONO = "'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace";
const BRAND = '#111827';
const BRAND_LIGHT = '#f4f4f5';
const BRAND_ACCENT = '#6b7280';
const TEXT_PRIMARY = '#111827';
const TEXT_BODY = '#374151';
const TEXT_SUBTLE = '#6b7280';
const TEXT_MUTED = '#9ca3af';
const BG_PAGE = '#f4f4f5';
const BG_CARD = '#ffffff';
const BORDER = '#f0f0f2';

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="de" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Immivo</title>
  <!--[if mso]>
  <style>body, table, td { font-family: Arial, sans-serif !important; }</style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${BG_PAGE}; font-family: ${FONT}; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BG_PAGE};">
    <tr>
      <td style="padding: 48px 24px;" align="center">
        <!--[if mso]><table role="presentation" width="460" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td><![endif]-->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 460px; background: ${BG_CARD}; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 6px 16px rgba(0,0,0,0.04);">
          
          <!-- Logo + Accent Bar -->
          <tr>
            <td style="padding: 32px 36px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="font-size: 24px; font-weight: 800; color: ${BRAND}; letter-spacing: -0.5px; text-decoration: none;">immivo</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 14px;">
                    <div style="height: 3px; width: 40px; background-color: ${BRAND}; border-radius: 2px;"></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 28px 36px 8px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 36px 28px; border-top: 1px solid ${BORDER};">
              <p style="margin: 0; font-family: ${FONT}; font-size: 12px; line-height: 18px; color: ${TEXT_MUTED};">
                Leutgeb Holding &amp; Management GmbH &middot; Sterngasse 3, 1010 Wien
              </p>
              <p style="margin: 6px 0 0; font-family: ${FONT}; font-size: 12px; line-height: 18px; color: ${TEXT_MUTED};">
                Diese E-Mail wurde automatisch versendet. Bitte nicht direkt antworten.
              </p>
            </td>
          </tr>

        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function heading(text: string): string {
  return `<h1 style="margin: 0 0 12px; font-family: ${FONT}; font-size: 22px; font-weight: 700; color: ${TEXT_PRIMARY}; line-height: 1.3;">${text}</h1>`;
}

function paragraph(text: string): string {
  return `<p style="margin: 0 0 16px; font-family: ${FONT}; font-size: 15px; line-height: 1.65; color: ${TEXT_BODY};">${text}</p>`;
}

function codeBlock(code: string, label: string, validity?: string): string {
  return `
    <div style="background: ${BRAND_LIGHT}; border-radius: 12px; padding: 28px 20px; text-align: center; margin: 20px 0 24px;">
      <p style="margin: 0 0 14px; font-family: ${FONT}; font-size: 11px; font-weight: 700; color: ${BRAND_ACCENT}; text-transform: uppercase; letter-spacing: 2.5px;">${label}</p>
      <p style="margin: 0; font-family: ${MONO}; font-size: 38px; font-weight: 700; color: ${BRAND}; letter-spacing: 10px; line-height: 1; -webkit-user-select: all; user-select: all;">${code}</p>
      ${validity ? `<p style="margin: 16px 0 0; font-family: ${FONT}; font-size: 12px; color: ${TEXT_MUTED};">${validity}</p>` : ''}
    </div>`;
}

function credentialsBlock(email: string, password: string): string {
  return `
    <div style="background: ${BRAND_LIGHT}; border-radius: 12px; padding: 24px 28px; margin: 20px 0 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding: 0 0 16px;">
            <p style="margin: 0 0 4px; font-family: ${FONT}; font-size: 11px; font-weight: 700; color: ${BRAND_ACCENT}; text-transform: uppercase; letter-spacing: 1.5px;">E-Mail</p>
            <p style="margin: 0; font-family: ${FONT}; font-size: 15px; font-weight: 600; color: ${TEXT_PRIMARY};">${email}</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 16px 0 0; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 4px; font-family: ${FONT}; font-size: 11px; font-weight: 700; color: ${BRAND_ACCENT}; text-transform: uppercase; letter-spacing: 1.5px;">Temporäres Passwort</p>
            <p style="margin: 0; font-family: ${MONO}; font-size: 20px; font-weight: 700; color: ${BRAND}; letter-spacing: 1px; -webkit-user-select: all; user-select: all;">${password}</p>
          </td>
        </tr>
      </table>
    </div>`;
}

function ctaButton(text: string, href: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 4px 0 16px;">
      <tr>
        <td align="center" style="border-radius: 10px; background-color: ${BRAND};">
          <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${href}" style="height:48px;width:200px;v-text-anchor:middle;" arcsize="21%" fillcolor="${BRAND}"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${text}</center></v:roundrect><![endif]-->
          <!--[if !mso]><!-->
          <a href="${href}" target="_blank" style="display: inline-block; padding: 14px 36px; font-family: ${FONT}; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 10px; background-color: ${BRAND};">${text}</a>
          <!--<![endif]-->
        </td>
      </tr>
    </table>`;
}

function subtleNote(text: string): string {
  return `<p style="margin: 8px 0 0; font-family: ${FONT}; font-size: 13px; line-height: 1.5; color: ${TEXT_SUBTLE};">${text}</p>`;
}

function securityHint(text: string): string {
  return `
    <div style="background: #fefce8; border-left: 3px solid #eab308; border-radius: 0 8px 8px 0; padding: 12px 16px; margin: 8px 0 0;">
      <p style="margin: 0; font-family: ${FONT}; font-size: 13px; line-height: 1.5; color: #854d0e;">${text}</p>
    </div>`;
}

// ============================================================
// Email Content Functions
// ============================================================

function signUpEmail(code: string, name: string): string {
  const greeting = name ? `Hallo ${name},` : 'Hallo,';
  return baseTemplate(`
    ${heading('Willkommen bei Immivo')}
    ${paragraph(`${greeting} schön, dass du dabei bist! Bestätige deine E-Mail-Adresse mit diesem Code:`)}
    ${codeBlock(code, 'Verifizierungscode', 'Gültig für 24 Stunden')}
    ${ctaButton('Zur Anmeldung →', 'https://app.immivo.ai')}
    ${subtleNote('Falls du dich nicht bei Immivo registriert hast, kannst du diese E-Mail einfach ignorieren.')}
  `);
}

function forgotPasswordEmail(code: string, name: string): string {
  const greeting = name ? `Hallo ${name},` : 'Hallo,';
  return baseTemplate(`
    ${heading('Passwort zurücksetzen')}
    ${paragraph(`${greeting} du hast angefordert, dein Passwort zurückzusetzen. Verwende diesen Code:`)}
    ${codeBlock(code, 'Reset-Code', 'Gültig für 1 Stunde')}
    ${paragraph('Gib den Code auf der Passwort-Reset-Seite ein, um ein neues Passwort zu erstellen.')}
    ${securityHint('Teile diesen Code mit niemandem. Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren — dein Passwort bleibt unverändert.')}
  `);
}

function adminCreateUserEmail(tempPassword: string, name: string, email: string): string {
  const greeting = name ? `Hallo ${name},` : 'Hallo,';
  return baseTemplate(`
    ${heading('Du wurdest eingeladen!')}
    ${paragraph(`${greeting} du wurdest zu <strong style="color: ${TEXT_PRIMARY};">Immivo</strong> eingeladen — der intelligenten Plattform für Immobilienprofis.`)}
    ${paragraph('Melde dich mit deinen Zugangsdaten an:')}
    ${credentialsBlock(email, tempPassword)}
    ${ctaButton('Jetzt starten →', 'https://app.immivo.ai')}
    ${subtleNote('Du wirst beim ersten Login aufgefordert, ein eigenes Passwort zu erstellen.')}
  `);
}

function resendCodeEmail(code: string, name: string): string {
  const greeting = name ? `Hallo ${name},` : 'Hallo,';
  return baseTemplate(`
    ${heading('Neuer Verifizierungscode')}
    ${paragraph(`${greeting} hier ist dein neuer Code:`)}
    ${codeBlock(code, 'Verifizierungscode', 'Gültig für 24 Stunden')}
    ${ctaButton('Zur Anmeldung →', 'https://app.immivo.ai')}
  `);
}

function verifyAttributeEmail(code: string, name: string): string {
  const greeting = name ? `Hallo ${name},` : 'Hallo,';
  return baseTemplate(`
    ${heading('Änderung bestätigen')}
    ${paragraph(`${greeting} bitte bestätige die Änderung an deinem Konto mit diesem Code:`)}
    ${codeBlock(code, 'Bestätigungscode', 'Gültig für 24 Stunden')}
    ${subtleNote('Falls du keine Änderung vorgenommen hast, kontaktiere bitte unseren Support unter support@immivo.ai.')}
  `);
}

function authenticationEmail(code: string, name: string): string {
  const greeting = name ? `Hallo ${name},` : 'Hallo,';
  return baseTemplate(`
    ${heading('Dein Anmeldecode')}
    ${paragraph(`${greeting} verwende diesen Code, um dich anzumelden:`)}
    ${codeBlock(code, 'Anmeldecode', 'Gültig für 5 Minuten')}
    ${securityHint('Falls du dich nicht anmelden wolltest, ändere bitte umgehend dein Passwort unter app.immivo.ai.')}
  `);
}

// ============================================================
// Lambda Handler
// ============================================================

export const handler = async (event: any) => {
  console.log('CustomEmailSender trigger:', event.triggerSource);

  try {
    if (!event.request.code) {
      console.log('No code in request, skipping');
      return event;
    }

    // Decrypt the code that Cognito encrypted with KMS
    const { plaintext } = await decrypt(keyring, Buffer.from(event.request.code, 'base64'));
    const code = plaintext.toString();

    const email = event.request.userAttributes.email;
    const givenName = event.request.userAttributes.given_name || '';

    if (!email) {
      console.error('No email address found in user attributes');
      return event;
    }

    const resendClient = await getResend();

    let subject: string;
    let html: string;

    switch (event.triggerSource) {
      case 'CustomEmailSender_SignUp':
        subject = 'Bestätige deine E-Mail – Immivo';
        html = signUpEmail(code, givenName);
        break;

      case 'CustomEmailSender_ForgotPassword':
        subject = 'Passwort zurücksetzen – Immivo';
        html = forgotPasswordEmail(code, givenName);
        break;

      case 'CustomEmailSender_AdminCreateUser':
        subject = 'Willkommen bei Immivo – Deine Einladung';
        html = adminCreateUserEmail(code, givenName, email);
        break;

      case 'CustomEmailSender_ResendCode':
        subject = 'Neuer Verifizierungscode – Immivo';
        html = resendCodeEmail(code, givenName);
        break;

      case 'CustomEmailSender_UpdateUserAttribute':
      case 'CustomEmailSender_VerifyUserAttribute':
        subject = 'Bestätige deine Änderung – Immivo';
        html = verifyAttributeEmail(code, givenName);
        break;

      case 'CustomEmailSender_Authentication':
        subject = 'Dein Anmeldecode – Immivo';
        html = authenticationEmail(code, givenName);
        break;

      default:
        console.log('Unknown trigger source:', event.triggerSource);
        return event;
    }

    const { error } = await resendClient.emails.send({
      from: 'Immivo <noreply@immivo.ai>',
      to: email,
      subject,
      html,
    });

    if (error) {
      console.error('Resend send error:', JSON.stringify(error));
    } else {
      console.log(`Email sent [${event.triggerSource}] to: ${email}`);
    }
  } catch (err: any) {
    console.error('CustomEmailSender error:', err.message, err.stack);
  }

  return event;
};

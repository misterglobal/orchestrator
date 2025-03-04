import dotenv from 'dotenv';
import { google } from 'googleapis';
import open from 'open';
import http from 'http';
import url from 'url';

// Load environment variables from .env.development
dotenv.config({ path: '.env.development' });

// Debug logging to check if environment variables are loaded
console.log('Checking credentials:');
console.log('Client ID exists:', !!process.env.GMAIL_CLIENT_ID);
console.log('Client Secret exists:', !!process.env.GMAIL_CLIENT_SECRET);
console.log('Redirect URI:', process.env.GMAIL_REDIRECT_URI);

if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET || !process.env.GMAIL_REDIRECT_URI) {
  console.error('Missing required environment variables. Please check your .env.development file');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

// Define the scopes we need
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

async function getAccessToken() {
  try {
    // Create a temporary server to handle the OAuth callback
    const server = http.createServer(async (req, res) => {
      try {
        const queryObject = url.parse(req.url || '', true).query;
        const code = queryObject.code as string;

        if (code) {
          // Close the response
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('Authorization successful! You can close this window.');

          // Get the tokens
          const { tokens } = await oauth2Client.getToken(code);
          console.log('\nSuccessfully retrieved tokens:');
          console.log('Access Token:', tokens.access_token ? '✓ (received)' : '✗ (missing)');
          console.log('Refresh Token:', tokens.refresh_token ? '✓ (received)' : '✗ (missing)');
          
          if (tokens.refresh_token) {
            console.log('\nAdd this to your .env.development file:');
            console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
          }

          // Close the server
          server.close();
          process.exit(0);
        }
      } catch (err) {
        const error = err as Error;
        console.error('Error processing callback:', error.message);
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('Authorization failed! Please check the console.');
      }
    });

    // Start the server
    server.listen(3000, () => {
      console.log('\nTemporary server is running on http://localhost:3000');
    });

    const authorizeUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      include_granted_scopes: true,
      prompt: 'consent'  // Force consent screen to get refresh token
    });

    console.log('\nAuthorize this app by visiting this url:', authorizeUrl);
    await open(authorizeUrl);
    
  } catch (err) {
    const error = err as Error;
    console.error('Error during authorization:', error.message);
  }
}

getAccessToken(); 
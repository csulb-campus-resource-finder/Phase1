import twilio from 'twilio';

// Initialize Twilio client using environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || '+14243535094';

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export async function sendSmsVerification(toPhoneNumber: string, code: string) {
  // ALWAYS print the verification code to the backend terminal so you never get stuck
  console.log('\n========================================');
  console.log(`📱 [DEV SMS BACKEND] Code for ${toPhoneNumber}: ${code}`);
  console.log('========================================\n');

  if (!client) {
    console.warn('Twilio credentials not configured. Skipping live SMS send.');
    return;
  }

  try {
    await client.messages.create({
      body: `Your CSULB Campus Resource Finder verification code is: ${code}`,
      from: twilioPhoneNumber,
      to: toPhoneNumber,
    });
    console.log('Twilio SMS sent successfully!');
  } catch (error: any) {
    console.error('Twilio SMS send failed (using terminal fallback code above):', error.message);
  }
}
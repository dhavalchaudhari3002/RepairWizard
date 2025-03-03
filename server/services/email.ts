import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY environment variable must be set");
}

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(userEmail: string, firstName: string): Promise<boolean> {
  try {
    console.log('Attempting to send welcome email to:', userEmail);
    console.log('Verifying Resend API key is set:', process.env.RESEND_API_KEY ? 'Yes' : 'No');

    if (!userEmail || !firstName) {
      console.error('Invalid parameters:', { userEmail, firstName });
      return false;
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('Resend API key is not set');
      throw new Error('Email service configuration error');
    }

    // Test the API key first
    try {
      const domains = await resend.domains.list();
      console.log('Successfully connected to Resend. Domains:', domains);
    } catch (domainError) {
      console.error('Failed to verify Resend connection:', domainError);
      throw new Error('Failed to verify email service connection');
    }

    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: [userEmail],
      subject: 'Welcome to AI Repair Assistant!',
      html: `<p>Welcome to AI Repair Assistant, ${firstName}!</p>
<p>Thank you for joining our platform.</p>
<p>If you have any questions, our support team is here to help.</p>`
    });

    if (error) {
      console.error('Failed to send welcome email. Error details:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log('Welcome email sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Error sending welcome email. Full error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return false;
  }
}
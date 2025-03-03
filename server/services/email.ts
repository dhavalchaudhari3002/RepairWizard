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

    const { data, error } = await resend.emails.send({
      from: 'AI Repair Assistant <no-reply@resend.dev>',
      to: [userEmail],
      subject: 'Welcome to AI Repair Assistant!',
      html: `
        <h1>Welcome to AI Repair Assistant, ${firstName}!</h1>
        <p>Thank you for joining our platform. We're excited to help you with all your repair needs.</p>
        <p>Here's what you can do with AI Repair Assistant:</p>
        <ul>
          <li>Get expert guidance on repairs</li>
          <li>Receive accurate cost estimates</li>
          <li>Access step-by-step repair instructions</li>
        </ul>
        <p>If you have any questions, feel free to reach out to our support team.</p>
      `
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
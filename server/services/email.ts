import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendWelcomeEmail(userEmail: string, firstName: string): Promise<boolean> {
  try {
    console.log('Starting welcome email process for:', {
      to: userEmail,
      firstName,
      hasApiKey: !!process.env.SENDGRID_API_KEY
    });

    if (!userEmail || !firstName) {
      console.error('Invalid parameters:', { userEmail, firstName });
      return false;
    }

    const msg = {
      to: userEmail,
      from: 'noreply@airepairassistant.com', // Update this with your verified sender
      subject: 'Welcome to AI Repair Assistant!',
      text: `Welcome to AI Repair Assistant, ${firstName}!\n\nThank you for joining our platform.\n\nIf you have any questions, our support team is here to help.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome, ${firstName}! 🎉</h2>
          <p>Thank you for joining AI Repair Assistant. We're excited to help you with your repair needs!</p>
          <p>You can now log in to your account and start using our services.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">AI Repair Assistant - Your intelligent repair companion</p>
        </div>
      `
    };

    console.log('Attempting to send email via SendGrid...');
    const [response] = await sgMail.send(msg);

    console.log('SendGrid API Response:', {
      statusCode: response?.statusCode,
      headers: response?.headers,
      to: userEmail
    });

    if (response?.statusCode === 202) {
      console.log('Welcome email sent successfully!');
      return true;
    } else {
      console.error('Unexpected status code from SendGrid:', response?.statusCode);
      return false;
    }
  } catch (error: any) {
    console.error('Error sending welcome email:', {
      error: error.message,
      response: error.response?.body,
      code: error.code,
    });

    if (error.response?.body?.errors) {
      console.error('SendGrid API Errors:', error.response.body.errors);
    }

    return false;
  }
}